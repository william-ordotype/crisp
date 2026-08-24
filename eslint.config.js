// Parse-floor gate. crisp-loader.js is served RAW from jsDelivr to every
// Webflow page, including the old hospital browsers (Chrome 78 / Safari 13
// fleet). Two things kill the WHOLE file at parse time there, so they are
// build errors here:
//   - ecmaVersion 2019: anything newer is a parse error in this lint run.
//     ?. and ?? kill Chrome < 80 / Safari < 13.1 (Sentry ORDOTYPE-FRONTEND-1F7,
//     where one ?. token killed the loader on Chrome 78 for seven months),
//     ??= kills Chrome < 85 / Safari < 14, class fields kill Safari < 14.1.
//   - lookbehind inside a regex LITERAL: valid ES2018, so the parser accepts
//     it, but Safari <= 16.3 rejects the whole file. The string form
//     new RegExp("(?<=a)b") is runtime-only and stays allowed (it is the
//     feature probe the loader relies on).
// No style rules on purpose. Run: npx --yes eslint@10 .
// (also run by .github/workflows/parse-floor.yml on every push)
module.exports = [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2019,
      sourceType: "script",
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[regex.pattern=/\\(\\?<[=!]/]",
          message:
            "Lookbehind in a regex literal kills this whole file at parse time on Safari <= 16.3. Use new RegExp(\"...\") instead.",
        },
      ],
    },
  },
];
