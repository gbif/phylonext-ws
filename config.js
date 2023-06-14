const os = require("os");

const userHomeDir = os.homedir();
const PhyloNextTestDataDir = `${userHomeDir}/.nextflow/assets/vmikk/phylonext/test_data`
const PhyloNextPipelineDataDir = `${userHomeDir}/.nextflow/assets/vmikk/phylonext/pipeline_data`
const OUTPUT_PATH = `${userHomeDir}/phylonext_data/runs`;
const PERSISTANT_ACCESS_PATH = `${userHomeDir}/phylonext_data/persistant`

const env = process.env.NODE_ENV || 'local';

console.log('ENV: ' + env);

const config = {
  local: {
    INPUT_PATH:  `${userHomeDir}/phylonext_data/occurrence.parquet`, // `${PhyloNextTestDataDir}/test_config`,   path to the parquet data
    OUTPUT_PATH: OUTPUT_PATH, // working dir, where results will be stored and zipped
    TEST_DATA:    PhyloNextTestDataDir, 
    PIPELINE_DATA: PhyloNextPipelineDataDir,
    EXPRESS_PORT: 9000,
    NEXTFLOW: `${userHomeDir}/nextflow`, // where is the NextFlow executable
    GBIF_API: 'https://api.gbif-uat.org/v1/',
    GBIF_REGISTRY_API: 'https://registry-api.gbif-uat.org/',
    CONCURRENT_RUNS_ALLOWED: 3,
    PERSISTANT_ACCESS_PATH: PERSISTANT_ACCESS_PATH, // Suggest some path like /mnt/auto/misc/download.gbif.org/phylonext/YYYY/MM/some-sort-of-key-or-uuid.zip
    PERSISTANT_ACCESS_URI: "http://download.gbif.org/phylonext/",
    DB_LOCATION : `${userHomeDir}/phylonext_data/db.json`
  },
/*   local: {
    INPUT_PATH:  '/Users/thomas/phylonext_data/occurrence.parquet_2', // `${PhyloNextTestDataDir}/test_config`,   path to the parquet data
    OUTPUT_PATH: OUTPUT_PATH, // working dir, where results will be stored and zipped
    TEST_DATA:    PhyloNextTestDataDir, 
    PIPELINE_DATA: PhyloNextPipelineDataDir,
    EXPRESS_PORT: 9000, 
    NEXTFLOW: '/Users/thomas/nextflow/nextflow', // where is the NextFlow executable
    GBIF_API: 'https://api.gbif-uat.org/v1/',
    GBIF_REGISTRY_API: 'https://registry-api.gbif-uat.org/',
    CONCURRENT_RUNS_ALLOWED: 3,
    PERSISTANT_ACCESS_PATH: PERSISTANT_ACCESS_PATH, // Suggest some path like /mnt/auto/misc/download.gbif.org/phylonext/YYYY/MM/some-sort-of-key-or-uuid.zip
    PERSISTANT_ACCESS_URI: "http://download.gbif.org/phylonext/",
    DB_LOCATION : '/Users/thomas/phylonext_data/db.json'
  }, */
  production: {
    INPUT_PATH: `/mnt/auto/scratch/mblissett/cloud-data/latest/occurrence.parquet`,  // path to the parquet data
    OUTPUT_PATH: '/opt/phylonext/runs', // working dir, where results will be stored and zipped
    TEST_DATA:    '/opt/phylonext/.nextflow/assets/vmikk/phylonext/test_data', 
    PIPELINE_DATA: '/opt/phylonext/.nextflow/assets/vmikk/phylonext/pipeline_data', 
    EXPRESS_PORT: 9000,
    NEXTFLOW: '/opt/phylonext/nextflow', // where is the NextFlow executable
    GBIF_API: 'https://api.gbif.org/v1/',
    GBIF_REGISTRY_API: 'https://registry-api.gbif.org/',
    CONCURRENT_RUNS_ALLOWED: 3,
    PERSISTANT_ACCESS_PATH: '/mnt/auto/misc/download.gbif.org/phylonext',
    PERSISTANT_ACCESS_URI: "http://download.gbif.org/phylonext/",
    DB_LOCATION : '/opt/phylonext/db.json'
  },
};

module.exports = config[env];
