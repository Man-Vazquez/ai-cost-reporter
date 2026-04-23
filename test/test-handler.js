const { handler } = require("../index");

handler({ providers: ["openai"] })
  .then(() => console.log("Handler finalizado"))
  .catch(err => console.error("Error:", err));
