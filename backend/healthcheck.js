const port = process.env.PORT || 3001;

fetch(`http://localhost:${port}/health`)
  .then((response) => {
    if (!response.ok) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(() => process.exit(1));
