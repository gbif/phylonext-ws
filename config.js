const os = require("os");
const OUTPUT_PATH = '/Users/thomas/phylonext_data/runs';
const userHomeDir = os.homedir();
const PhyloNextTestDataDir = `${userHomeDir}/.nextflow/assets/vmikk/phylonext/test_data`
const env = process.env.NODE_ENV || 'local';

console.log('ENV: ' + env);

const config = {
  local: {
    INPUT_PATH: `${PhyloNextTestDataDir}/test_config`,  // '/Users/thomas/phylonext_data/occurrence.parquet'  path to the parquet data
    OUTPUT_PATH: OUTPUT_PATH, // working dir, where results will be stored and zipped
    TEST_DATA:    PhyloNextTestDataDir, 
    EXPRESS_PORT: 9000,
    NEXTFLOW: '/Users/thomas/nextflow/nextflow', // where is the NextFlow executable
    GBIF_API: 'https://api.gbif.org/v1/',
    CONCURRENT_RUNS_ALLOWED: 3
  },
  production: {
    INPUT_PATH: PhyloNextTestDataDir,  // '/Users/thomas/phylonext-ws/occurrence.parquet'  path to the parquet data
    OUTPUT_PATH: OUTPUT_PATH, // working dir, where results will be stored and zipped
    TEST_DATA:    PhyloNextTestDataDir, 
    EXPRESS_PORT: 80,
    NEXTFLOW: '/Users/thomas/nextflow/nextflow', // where is the NextFlow executable
    GBIF_API: 'https://api.gbif.org/v1/',
    CONCURRENT_RUNS_ALLOWED: 3
  },
};

module.exports = config[env];
