"use strict";
const _ = require("lodash");
const parse = require("csv-parse");
const transform = require("stream-transform");
const config = require("./config");
const fs = require("fs");
const auth = require("./Auth/auth");
const axios = require("axios")
const db = require("./db");
const FormData = require("form-data");

/* const parser = parse({
  delimiter: "\t",
  columns: true,
  ltrim: true,
  rtrim: true,
  quote: null,
}); */

const transformer = transform(function (record, callback) {
  callback(null, record.datasetkey);
});

/* const registerDerivedDataset = (user, runid, YYYY, MM, title) => {
  return new Promise((resolve, reject) => {
    let form = new FormData();
   // form.append("sourceUrl", `${config.PERSISTANT_ACCESS_URI}${YYYY}/${MM}/${runid}.zip`);
    form.append("derivedDataset", JSON.stringify({
        "title": title,
        "sourceUrl": `${config.PERSISTANT_ACCESS_URI}${YYYY}/${MM}/${runid}.zip`
    }) , {contentType: "application/json" } );
     form.append(
      "relatedDatasets",
      fs
        .createReadStream(
          `${config.OUTPUT_PATH}/${runid}/output/pipeline_info/Dataset_DOIs.txt`
        )
       .pipe(parser)
        .pipe(transformer),
      { filename: "relatedDatasets.csv", contentType: "application/csv" }
    ); 

    form.submit(
      {
        host: config.GBIF_API.split("/v1/")[0].split("//")[1],
        path: "/v1/derivedDataset",
        headers: { "User-Agent": "PhyloNext",  "Authorization": `Bearer ${user.token}` , 'Content-Type': 'multipart/form-data' }
      },
      function (err, res) {
        if (err) {
          reject(err);
        } else {
          console.log(res.statusCode);
          console.log(Object.keys(res))
          resolve(res);
        }
      }
    );
  });
}; */

const registerDerivedDataset2 = async (user, runid, YYYY, MM, title, description) => {
  const parser = parse({
    delimiter: "\t",
    columns: true,
    ltrim: true,
    rtrim: true,
    quote: null,
  });
    return new Promise((resolve, reject) => {
      let relatedDatasets = {};
       let stream = fs
          .createReadStream(
            `${config.OUTPUT_PATH}/${runid}/output/pipeline_info/Dataset_DOIs.txt`
          )
         .pipe(parser)
         .on("data", function (row) {
           // skip header
           if(row.datasetkey !== "datasetkey") {
            relatedDatasets[row.datasetkey] = 1;
           }
          })
        .on('end', async () => {
           try {
            const res = await axios.post( `${config.GBIF_API}derivedDataset` , {
                "title": title,
                "description": description,
                "sourceUrl": `${config.PERSISTANT_ACCESS_URI}${YYYY}/${MM}/${runid}.zip`,
                relatedDatasets: relatedDatasets
            }, {
                headers:{
                    'Authorization': `Bearer ${user.token}`
                 }
            })
            resolve(res)
           } catch (error) {
            reject(error)
           }      
        }).on('error', (e) => {
            reject(e)
        })
    });
  };

module.exports = (app) => {
  app.post(
    "/phylonext/job/:runid/derivedDataset",
    auth.appendUser(),
    async function (req, res) {
      if (!req.params.runid) {
        res.sendStatus(404);
      } else {
        try {
          db.read();
          const run = db.get("runs").find({ run: req.params.runid }).value();
          if (_.get(run, "doi")) {
            return res.json({ doi: _.get(run, "doi") });
          } else {
            // Check that the path to persitant storage exists or create
            const now = new Date();
            const MM = String(now.getMonth() + 1).padStart(2, "0");
            const YYYY = now.getFullYear();
            if (!fs.existsSync(`${config.PERSISTANT_ACCESS_PATH}/${YYYY}/${MM}`)) {
              await fs.promises.mkdir(
                `${config.PERSISTANT_ACCESS_PATH}/${YYYY}/${MM}`,
                { recursive: true }
              );
            }
            const pathToArchive = `${config.OUTPUT_PATH}/${req.params.runid}/${req.params.runid}.zip`;

            // Copy the zip archive
            await fs.promises.copyFile(
              pathToArchive,
              `${config.PERSISTANT_ACCESS_PATH}/${YYYY}/${MM}/${req.params.runid}.zip`
            );
            const derivedDataset = await registerDerivedDataset2(req.user, req.params.runid, YYYY, MM, 
                req?.body?.title || 'Occurrences filtered from the GBIF monthly snapshot for Phylogenetic diversity analysis using the PhyloNext pipeline',
                req?.body?.description || ""  )
            run.doi = derivedDataset?.data?.doi;
            db.get('runs')
                .find({ run: req.params.runid })
                .assign({ doi: derivedDataset?.data?.doi})
                .write()
            res.send(derivedDataset?.data)

          }
        } catch (error) {
            if(error?.response?.data && error?.response?.status){
                res.status(error?.response?.status).send(error?.response?.data)
            } else {
                console.log(error)
                res.sendStatus(500);
            }
          
        }
      }
    }
  );
};
