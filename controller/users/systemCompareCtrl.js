const Product = require('../../models/productDb');
const GameRequirement = require('../../models/GameRequirementDb');
const { fetchCPUBenchmark, fetchGPUBenchmark } = require('../../config/scoreFetcher');





const checkSystemPage = async (req, res) => {
  try {
    const products = await Product.find({ isListed: true }); // Fetch all listed products
    res.render('runThis?', { products }); // system-checker.ejs or .hbs
  } catch (error) {
    console.error('Error rendering system checker:', error);
    res.status(500).send('Internal Server Error');
  }
};


const checkCompatibility = async (req, res) => {
  try {
    const { processor, graphics, ram, storage, application, os } = req.body;
    console.log(req.body)
    if (!processor || !graphics || !ram || !storage || !application || !os) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const cpuScore = await fetchCPUBenchmark(processor);
    const gpuScore = await fetchGPUBenchmark(graphics);

    const product = await Product.findOne({ name: application });
    if (!product) return res.status(404).json({ error: 'Game not found.' });

    const requirements = await GameRequirement.findOne({ productId: product._id });
    if (!requirements) return res.status(404).json({ error: 'Requirements not found.' });

    const min = requirements.minimum || {};
    const rec = requirements.recommended || {};

    const requiredCPU = parseInt(min.processorScore) || 0;
    const requiredGPU = parseInt(min.graphicsScore) || 0;
    const requiredRAM = parseInt(min.memoryGB) || 0;
    const requiredStorage = parseInt(min.storageGB) || 0;

    let score = 0;
    if (cpuScore >= requiredCPU) score += 25;
    if (gpuScore >= requiredGPU) score += 25;
    if (ram >= requiredRAM) score += 25;
    if (storage >= requiredStorage) score += 25;

    const statusMessage =
      score === 100
        ? '✅ Fully Compatible'
        : score >= 75
        ? '🟡 Compatible with minor limitations'
        : score >= 50
        ? '⚠️ May experience performance issues'
        : '❌ Not compatible';

    res.json({
      compatibilityScore: `${score}%`,
      statusMessage,
      user: { processor, cpuScore, graphics, gpuScore, ram, storage, os },
      requirements: {
        minimum: [
          `CPU: ${min.processor || 'Unknown'} (Score ≥ ${requiredCPU})`,
          `GPU: ${min.graphics || 'Unknown'} (Score ≥ ${requiredGPU})`,
          `RAM: ${requiredRAM} GB`,
          `Storage: ${requiredStorage} GB`
        ],
        recommended: [
          `CPU: ${rec.processor || 'Unknown'} (Score ≥ ${rec.processorScore || 0})`,
          `GPU: ${rec.graphics || 'Unknown'} (Score ≥ ${rec.graphicsScore || 0})`,
          `RAM: ${rec.memoryGB || 0} GB`,
          `Storage: ${rec.storageGB || 0} GB`
        ]
      }
    });
  } catch (err) {
    console.error('Error in checkCompatibility:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


module.exports = {
  checkSystemPage,
  checkCompatibility,
};
