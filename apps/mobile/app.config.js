// Lê o app.json e deixa publicar a versão web do app numa subpasta
// (ex.: https://usuario.github.io/Adegas/app). Sem ADEGAS_BASE_URL, nada muda.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.ADEGAS_BASE_URL ? { baseUrl: process.env.ADEGAS_BASE_URL } : {}),
  },
});
