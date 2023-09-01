"use strict";
const _ = require("lodash");
const child_process = require("child_process");
const config = require("./config");
const async = require("async");
const db = require("./db");
const fs = require("fs");
const auth = require("./Auth/auth");
const multer = require("multer");
const storage = multer.diskStorage({
  //Specify the destination directory where the file needs to be saved
  destination: function (req, file, cb) {
    // console.log("Uploaded by "+ req?.user?.userName)
      const jobDir = `${config.OUTPUT_PATH}/${req.id}`;
      const workingDir = `${jobDir}/work`;
      const outputDir = `${jobDir}/output`;

      try {
        if (!fs.existsSync(jobDir)){
          fs.mkdirSync(jobDir, { recursive: true });
        }
        if (!fs.existsSync(workingDir)){
          fs.mkdirSync(workingDir, { recursive: true });
        }
        if (!fs.existsSync(outputDir)){
          fs.mkdirSync(outputDir, { recursive: true });
        }
         
         cb(null, outputDir)


      } catch (error) {
        console.log("Failed to create output directory");
        cb(error, null);
      }
    
  
},
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  },
})

const upload = multer({
  storage: storage,
})
const spawn = child_process.spawn;
const NEXTFLOW = config.NEXTFLOW;
const jobs = new Map();


const ALLOWED_PARAMS = [
  "phytree",
  "phylabels",
  "taxgroup",
  "phylum",
  "classis",
  "order",
  "family",
  "genus",
  "country",
  "latmin",
  "latmax",
  "lonmin",
  "lonmax",
  "minyear",
  "maxyear",
  "noextinct",
  "roundcoords",
  "h3resolution",
  "dbscan",
  "dbscannoccurrences",
  "dbscanepsilon",
  "dbscanminpts",
  "wgsrpd",
  "regions",
  "indices",
  "randname",
  "iterations",
  "terrestrial",
  "rmcountrycentroids",
  "rmcountrycapitals",
  "rmurban",
  "basisofrecordinclude",
  "basisofrecordexclude",
  "leaflet_var",
  "randconstrain",
  "polygon"
];

const FILE_MAPPINGS = {
  terrestrial: "Land_Buffered_025_dgr.RData",
  rmcountrycentroids: "CC_CountryCentroids_buf_1000m.RData",
  rmcountrycapitals: "CC_Capitals_buf_10000m.RData",
  rmurban: "CC_Urban.RData",
  wgsrpd: "WGSRPD.RData"
}

const zipRun = (runid) => {
  return new Promise((resolve, reject) => {
    child_process.exec(
      `zip -r ${config.OUTPUT_PATH}/${runid}/${runid}.zip output/*`,
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

const processStdout = (data) => {
  const lines = data.reduce((acc, e) => [...acc, ...e.split("\n")], []);
  const idx = lines.findIndex(e => e.startsWith("executor >"))
  if (idx > -1) {
    const index = idx - 1;
    let first = lines.slice(0, idx);
    let rest = lines.slice(index);
    let executor = "";
    const process = new Map();
    let resultLine = "\n";
    rest.forEach((p) => {
      if (p.startsWith("executor >")) {
        executor = p;
      } else if (p.indexOf("process > ") > -1 && !p.startsWith('Error')) {
        let splitted = p.split(" process > ");
        process.set(splitted[1].split(" ")[0], p);
      } else if (p) {
        resultLine += `${p}\n`;
      }
    });

    return [...first.filter((l) => !!l && l !== "\n").map(l => `${l}\n`), executor, ...process.values(), resultLine]

  } else {
    return data;
  }
};

const killJob = (jobId) => {
  if (jobs.has(jobId)) {
    console.log("Job found")
    const job = jobs.get(jobId);
    if (typeof job?.processRef?.kill === 'function') {
      console.log("Sending SIGINT to process")
      job?.processRef?.kill('SIGINT')
    }
  } else {
    return "Not found"
  }
}

const removeJobData = (jobId) => {
  const jobDir = `${config.OUTPUT_PATH}/${jobId}`;
  return fs.promises.rm(jobDir, { recursive: true, force: true })
}

module.exports = (app) => {
  app.get("/phylonext/jobs/running", function (req, res) {
    try {
      const running = [...jobs.keys()];
      res.json(running);
    } catch (error) {
      res.sendStatus(500);
    }
  });
  app.post("/phylonext", auth.appendUser(), upload.fields([{ name: 'polygon', maxCount: 1 },{ name: 'randconstrain', maxCount: 1 }]), async function (req, res) {
    try {
      const jobDir = `${config.OUTPUT_PATH}/${req.id}`;
      const workingDir = `${jobDir}/work`;
      const outputDir = `${jobDir}/output`;
      if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir, { recursive: true });
      }
      let body = JSON.parse(req.body.data);
      if(_.get(req, 'files.polygon[0].filename')){
          body.polygon = `${outputDir}/${req.files.polygon[0].filename}`
          console.log(req.files.polygon[0])
      }
      if(_.get(req, 'files.randconstrain[0].filename')){
          body.randconstrain = `${outputDir}/${req.files.randconstrain[0].filename}`;
      }
        const fileParams = Object.keys(FILE_MAPPINGS).reduce((acc, curr) => {
          acc[curr] = _.get(body, curr) === true ? `${config.PIPELINE_DATA}/${FILE_MAPPINGS[curr]}` : false;
          return acc;
        }, {})
     
          if (body.phytree) {
            try {
              await fs.promises.writeFile(
                `${outputDir}/input_tree.nwk`,
                body.phytree,
                "utf-8"
              );
              pushJob({
                username: req?.user?.userName,
                req_id: req.id,
                params: { ...body, phytree: `${outputDir}/input_tree.nwk`, ...fileParams },
                res,
              });
            } catch (e) {
              console.log("Failed to write input tree");
              return res.status(500).send(e);
            }
          } else if (body.prepared_phytree) {
            try {
              await fs.promises.copyFile(
                `${config.TEST_DATA}/phy_trees/${body.prepared_phytree}`,
                `${outputDir}/input_tree.nwk`
              );
              pushJob({
                username: req?.user?.userName,
                req_id: req.id,
                params: { ...body, phytree: `${outputDir}/input_tree.nwk`, ...fileParams },
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
              params: { ...body, ...fileParams },
              res,
            });
          }
        res.status(200).json({ jobid: req.id });
      } catch (err) {
        console.log(err);
        return res.status(500).send(err);
      }
})


  const pushJob = (options, res) => {
    jobQueue.push(options, function (err) {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else {
        // Clean up job list
        jobs.delete(options.req_id);

        zipRun(options.req_id)
          .then(() => { })
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
            const run = db.get("runs").find({ run: req.params.jobid }).value() || {};
            res.json({ ...run, completed: true });
          }
        }
      );
    }
  });

  app.put("/phylonext/job/:jobid/abort", auth.appendUser(), function (req, res) {

    try {
      if (!req.params.jobid) {
        // error
        res.sendStatus(400);
      } else if (jobs.has(req.params.jobid)) {
        db.read();
        const run = db.get("runs").filter({ username: req.user?.userName, run: req.params.jobid });
        if (!run) {
          res.sendStatus(404);
        } else {
          killJob(req.params.jobid)
          jobs.delete(req.params.jobid)
          //const data = jobs.get(req.params.jobid);
          res.sendStatus(204);
        }

      } else {
        res.sendStatus(500);
      }
    } catch (error) {

    }
  });

  app.delete("/phylonext/job/:jobid", auth.appendUser(), async function (req, res) {
    try {
      if (!req.params.jobid) {
        // error
        res.sendStatus(400);
      } else {

        db.read();
        const run = db.get("runs").filter({ username: req.user?.userName, run: req.params.jobid });
        if (!run) {
          res.sendStatus(404);
        } else {
          if (jobs.has(req.params.jobid)) {
            killJob(req.params.jobid)
            jobs.delete(req.params.jobid)

          }
          await removeJobData(req.params.jobid)
          db.get("runs").remove({ username: req.user?.userName, run: req.params.jobid })
            .write();

          res.sendStatus(204);
        }
      }
    } catch (error) {
      console.log(error)
      res.sendStatus(500);
    }

  });

  let jobQueue = async.queue(function (options, callback) {
    jobs.set(options.req_id, { stdout: [], stderr: [] });
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
    console.log(nextflowParams);
    try {
      let pcs = spawn(NEXTFLOW, nextflowParams, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      pcs.stdout.on("data", function (data) {
        if (jobs.has(options.req_id)) {
          const prev = jobs.get(options.req_id);
          jobs.set(options.req_id, {
            ...prev,
            processRef: pcs,
            stdout: processStdout([...prev.stdout, data.toString()]),
          });
        } else {
          jobs.set(options.req_id, { stdout: [data.toString()], stderr: [], processRef: pcs });
        }
      });
      pcs.stderr.on("data", function (data) {
        if (jobs.has(options.req_id)) {
          const prev = jobs.get(options.req_id);
          jobs.set(options.req_id, {
            ...prev,
            processRef: pcs,
            stderr: [...prev.stderr, data.toString()],
          });
        } else {
          jobs.set(options.req_id, { stderr: [data.toString()], stdout: [], processRef: pcs });
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
