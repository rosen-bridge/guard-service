const main = async () => {
  await import('./bootstrap');
  const { default: init } = await import('./init');
  await init();
};

main().then(() => null);
