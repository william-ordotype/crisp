// Parse-floor gate. crisp-loader.js is served RAW from jsDelivr to every
// Webflow page, including the old hospital browsers (Chrome 78 / Safari 13
// fleet). Two things kill the WHOLE file at parse time there, so they are
// build errors here:
//   - ecmaVersion 2019: any ES2020+ SYNTAX (?., ??, ??=, class fields...) is a
//     parse error in this lint run (Sentry ORDOTYPE-FRONTEND-1F7, where one
//     ?. token killed the loader on Chrome 78 for seven months).
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
