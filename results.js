"use strict";
const _ = require("lodash");
const config = require("./config");
const fs = require("fs");
const auth = require("./Auth/auth");
const db = require("./db");

module.exports = (app) => {
  app.get("/phylonext/job/:jobid/cloropleth.html", function (req, res) {
    if (!req.params.jobid) {
      res.sendStatus(404);
    } else {
      fs.readdir(
        `${config.OUTPUT_PATH}/${req.params.jobid}/output/03.Plots/`,
        function (err, fileList) {
          if (err) {
            res.sendStatus(404);
          } else {
            const html = fileList.find((file) => file === "Choropleth.html");
            if (html) {
              try {
                fs.createReadStream(
                  `${config.OUTPUT_PATH}/${req.params.jobid}/output/03.Plots/Choropleth.html`
                ).pipe(res);
              } catch (error) {
                res.sendStatus(500);
              }
            } else {
              res.sendStatus(404);
            }
          }
        }
      );
    }
  });

  app.get("/phylonext/job/:jobid/pipeline_dag.dot", function (req, res) {
    if (!req.params.jobid) {
      res.sendStatus(404);
    } else {
      fs.readdir(
        `${config.OUTPUT_PATH}/${req.params.jobid}/output/pipeline_info`,
        function (err, fileList) {
          if (err) {
            res.sendStatus(500);
          } else {
            const dot = fileList.find((file) => file.endsWith(".dot"));
            if (dot) {
              fs.createReadStream(
                `${config.OUTPUT_PATH}/${req.params.jobid}/output/pipeline_info/${dot}`
              ).pipe(res);
            } else {
              res.sendStatus(500);
            }
          }
        }
      );
    }
  });

  app.get("/phylonext/job/:jobid/execution_report.html", function (req, res) {
    if (!req.params.jobid) {
      res.sendStatus(404);
    } else {
      fs.readdir(
        `${config.OUTPUT_PATH}/${req.params.jobid}/output/pipeline_info/`,
        function (err, fileList) {
          if (err) {
            res.sendStatus(500);
          } else {
            const html = fileList.find(
              (file) =>
                file.startsWith("execution_report") && file.endsWith(".html")
            );
            if (html) {
              try {
                fs.createReadStream(
                  `${config.OUTPUT_PATH}/${req.params.jobid}/output/pipeline_info/${html}`
                ).pipe(res);
              } catch (error) {
                res.sendStatus(404);
              }
            } else {
              res.sendStatus(500);
            }
          }
        }
      );
    }
  });

  app.get("/phylonext/job/:jobid/pdf", function (req, res) {
    if (!req.params.jobid) {
      res.sendStatus(404);
    } else {
      fs.readdir(
        `${config.OUTPUT_PATH}/${req.params.jobid}/output/03.Plots/`,
        function (err, fileList) {
          if (err) {
            res.sendStatus(404);
          } else {
            const pdfs = fileList.filter((file) => file.endsWith(".pdf"));
            res.json(pdfs);
          }
        }
      );
    }
  });

  app.get("/phylonext/job/:jobid/pdf/:filename", function (req, res) {
    if (!req.params.jobid) {
      res.sendStatus(404);
    } else {
      fs.readdir(
        `${config.OUTPUT_PATH}/${req.params.jobid}/output/03.Plots/`,
        function (err, fileList) {
          if (err) {
            res.sendStatus(404);
          } else {
            const pdf = fileList.find((file) => file === req.params.filename);
            if (pdf) {
              try {
                fs.createReadStream(
                  `${config.OUTPUT_PATH}/${req.params.jobid}/output/03.Plots/${pdf}`
                ).pipe(res);
              } catch (error) {
                res.sendStatus(500);
              }
            } else {
              res.sendStatus(404);
            }
          }
        }
      );
    }
  });

  app.get("/phylonext/job/:jobid/archive.zip", function (req, res) {
    if (!req.params.jobid) {
      res.sendStatus(404);
    } else {
      fs.readdir(
        `${config.OUTPUT_PATH}/${req.params.jobid}/`,
        function (err, fileList) {
          if (err) {
            res.sendStatus(404);
          } else {
            const archive = fileList.find(
              (file) => file === `${req.params.jobid}.zip`
            );
            if (archive) {
              try {
                fs.createReadStream(
                  `${config.OUTPUT_PATH}/${req.params.jobid}/${req.params.jobid}.zip`
                ).pipe(res);
              } catch (error) {
                res.sendStatus(500);
              }
            } else {
              res.sendStatus(404);
            }
          }
        }
      );
    }
  });

  app.get("/phylonext/job/:jobid/tree", function (req, res) {
    if (!req.params.jobid) {
      res.sendStatus(404);
    } else {
      fs.readdir(
        `${config.OUTPUT_PATH}/${req.params.jobid}/output/`,
        function (err, fileList) {
          if (err) {
            res.sendStatus(404);
          } else {
            const tree = fileList.find((file) => file === `input_tree.nwk`);
            if (tree) {
              try {
                fs.createReadStream(
                  `${config.OUTPUT_PATH}/${req.params.jobid}/output/input_tree.nwk`
                ).pipe(res);
              } catch (error) {
                res.sendStatus(500);
              }
            } else {
              res.sendStatus(404);
            }
          }
        }
      );
    }
  });

  app.get("/phylonext/phy_trees", function (req, res) {
    fs.readdir(`${config.TEST_DATA}/phy_trees`, function (err, fileList) {
      if (err) {
        res.sendStatus(404);
      } else {
        const trees = fileList.filter((file) => file.endsWith(".nwk") || file.endsWith(".tre") );
        if (trees) {
          try {
            res.json(trees);
          } catch (error) {
            res.sendStatus(500);
          }
        } else {
          res.sendStatus(404);
        }
      }
    });
  });

  app.get("/phylonext/phy_trees/:tree", function (req, res) {
    fs.readdir(`${config.TEST_DATA}/phy_trees`, function (err, fileList) {
      if (err) {
        res.sendStatus(404);
      } else {
        const tree = fileList.find((file) => file === req.params.tree);
        if (tree) {
          try {
            fs.createReadStream(`${config.TEST_DATA}/phy_trees/${tree}`).pipe(
              res
            );
          } catch (error) {
            res.sendStatus(500);
          }
        } else {
          res.sendStatus(404);
        }
      }
    });
  });

  app.get("/phylonext/myruns", auth.appendUser(), function (req, res) {
    try {
      db.read();
      const runs = db.get("runs").filter({ username: req.user?.userName });
      res.json(runs.reverse());
    } catch (error) {
      res.sendStatus(404);
    }
  });


};
