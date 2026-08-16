import 'dotenv/config';
import app, { connectDB } from './app.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Database first - if this throws, the process exits instead of serving
    // requests it cannot fulfil.
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Health check:      http://localhost:${PORT}/health`);
      console.log(
        `AI insights:       ${
          process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your_openai_api_key_here'
            ? 'OpenAI enabled'
            : 'heuristic engine (no OPENAI_API_KEY set)'
        }`
      );
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

// A rejected promise nobody caught should be loud, not silent.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

startServer();
