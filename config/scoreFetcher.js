const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours
const normalize = str => str.toLowerCase().replace(/\s+/g, '');

const fetchCPUBenchmark = async (cpuName) => {
  const key = `cpu-${normalize(cpuName)}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const url = `https://www.cpubenchmark.net/cpu_lookup.php?cpu=${encodeURIComponent(cpuName)}`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const $ = cheerio.load(data);
    const scoreText = $('div#mark').text();
    const score = parseInt(scoreText.replace(/[^0-9]/g, '')) || 0;

    cache.set(key, score);
    return score;
  } catch (err) {
    console.error('CPU score fetch failed:', err.message);
    return 0;
  }
};

const fetchGPUBenchmark = async (gpuName) => {
  const key = `gpu-${normalize(gpuName)}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const url = `https://www.videocardbenchmark.net/gpu_lookup.php?gpu=${encodeURIComponent(gpuName)}`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const $ = cheerio.load(data);
    const scoreText = $('div#mark').text();
    const score = parseInt(scoreText.replace(/[^0-9]/g, '')) || 0;

    cache.set(key, score);
    return score;
  } catch (err) {
    console.error('GPU score fetch failed:', err.message);
    return 0;
  }
};

module.exports = {
  fetchCPUBenchmark,
  fetchGPUBenchmark
};