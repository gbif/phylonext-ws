"use strict";
const _ = require("lodash");
const child_process = require("child_process");
const config = require("./config");
const async = require("async");
const db = require("./db");
const fs = require("fs");
const auth = require("./Auth/auth");
const spawn = child_process.spawn;
const NEXTFLOW = config.NEXTFLOW;
const jobs = new Map();


const ALLOWED_PARAMS = [
  "phytree",
  "phylabels",
  "taxgroup",
  "phylum",
  "class",
  "order",
  "family",
  "country",
  "latmin",
  "latmax",
  "lonmin",
  "lonmax",
  "minyear",
  "noextinct",
  "roundcoords",
  "h3resolution",
  "dbscan",
  "dbscannoccurrences",
  "dbscanepsilon",
  "dbscanminpts",
  "terrestrial",
  "wgsrpd",
  "regions",
  "indices",
  "randname",
  "iterations",
];

const zipRun = (runid) => {
  return new Promise((resolve, reject) => {
    child_process.exec(
      `zip -r ${config.OUTPUT_PATH}/${runid}/${runid}.zip *`,
      {
        cwd: `${config.OUTPUT_PATH}/${runid}`,
      },
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};

module.exports = (app) => {
  app.post("/phylonext", auth.appendUser(), async function (req, res) {
    try {
      const jobDir = `${config.OUTPUT_PATH}/${req.id}`;
      const workingDir = `${jobDir}/work`;
      const outputDir = `${jobDir}/output`;
      try {
        await fs.promises.mkdir(jobDir);
        await fs.promises.mkdir(workingDir);
        await fs.promises.mkdir(outputDir);

        if (req.body.phytree) {
          try {
            await fs.promises.writeFile(
              `${outputDir}/input_tree.nwk`,
              req.body.phytree,
              "utf-8"
            );
            pushJob({
              username: req?.user?.userName,
              req_id: req.id,
              params: { ...req.body, phytree: `${outputDir}/input_tree.nwk` },
              res,
            });
          } catch (e) {
            console.log("Failed to write input tree");
            return res.status(500).send(e);
          }
        } else if (req.body.prepared_phytree) {
          try {
            await fs.promises.copyFile(
              `${config.TEST_DATA}/phy_trees/${req.body.prepared_phytree}`,
              `${outputDir}/input_tree.nwk`
            );
            pushJob({
              username: req?.user?.userName,
              req_id: req.id,
              params: { ...req.body, phytree: `${outputDir}/input_tree.nwk` },
              phylabels: "OTT",
              res,
            });
          } catch (e) {
            console.log(e);
            console.log("Failed to write input tree");
            return res.status(500).send(e);
          }
        } else {
          pushJob({
            username: req?.user?.userName,
            req_id: req.id,
            params: req.body,
            res,
          });
        }
      } catch (error) {
        console.log("Failed to create output directory");
        return res.status(500).send(error);
      }

      res.status(200).json({ jobid: req.id });
    } catch (err) {
      console.log(err);
      return res.status(500).send(err);
    }
  });

  const pushJob = (options, res) => {
    jobQueue.push(options, function (err) {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else {
        // Clean up job list
        jobs.delete(options.req_id);

        zipRun(options.req_id)
          .then(() => {})
          .catch((err) => {
            console.log(err);
          });
      }
    });
  };

  app.get("/phylonext/job/:jobid", function (req, res) {
    if (!req.params.jobid) {
      // error
      res.sendStatus(400);
    } else if (jobs.has(req.params.jobid)) {
      const data = jobs.get(req.params.jobid);
      res.json(data);
    } else {
      fs.readdir(
        `${config.OUTPUT_PATH}/${req.params.jobid}/output/`,
        function (err, fileList) {
          if (err) {
            res.sendStatus(404);
          } else {
            res.json({ completed: true });
          }
        }
      );
    }
  });

  let jobQueue = async.queue(function (options, callback) {
    jobs.set(options.req_id, { stdout: [] });
    try {
      db.read();
      db.get("runs")
        .push({
          username: options?.username,
          run: options.req_id,
          started: new Date().toISOString(),
          ...options.params,
        })
        .write();
    } catch (error) {
      console.log(error);
    }

    const params = options.params;
    const jobDir = `${config.OUTPUT_PATH}/${options.req_id}`;
    const workingDir = `${jobDir}/work`;
    const outputDir = `${jobDir}/output`;

    let profile = [];
    Object.keys(params)
      .filter((p) => ALLOWED_PARAMS.includes(p))
      .forEach((key) => {
        if (_.isArray(params[key])) {
          profile = [...profile, `--${key}`, params[key].join(",")];
        } else {
          profile = [...profile, `--${key}`, params[key]];
        }
      });

    const nextflowParams = [
      `run`,
      `vmikk/phylonext`,
      `-r`,
      `main`,
      `-w`,
      workingDir,
      `-profile`,
      `docker`,
      `--input`,
      config.INPUT_PATH,
      `--outdir`,
      outputDir,

      ...profile,
    ];
    // console.log(nextflowParams);
    try {
      let pcs = spawn(NEXTFLOW, nextflowParams, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      pcs.stdout.on("data", function (data) {
        if (jobs.has(options.req_id)) {
          const prev = jobs.get(options.req_id);
          jobs.set(options.req_id, {
            ...prev,
            stdout: [...prev.stdout, data.toString()],
          });
        } else {
          jobs.set(options.req_id, { stdout: [data.toString()], stderr: [] });
        }
      });
      pcs.stderr.on("data", function (data) {
        if (jobs.has(options.req_id)) {
          const prev = jobs.get(options.req_id);
          jobs.set(options.req_id, {
            ...prev,
            stderr: [...prev.stderr, data.toString()],
          });
        } else {
          jobs.set(options.req_id, { stderr: [data.toString()], stdout: [] });
        }
      });

      pcs.on("error", function (e) {
        console.log("Error running job");
        console.log(e);
        callback(e, null);
      });
      pcs.on("close", function () {
        callback(null);
      });
    } catch (err) {
      callback(err, null);
    }
  }, config.CONCURRENT_RUNS_ALLOWED);
};
