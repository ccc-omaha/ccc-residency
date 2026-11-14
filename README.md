# cccresidency.org

Site for CCC Church Residency, a ministry of Christ Community Church in Omaha.

- **Edit:** staff edit copy, residents, and photos in [Pages CMS](https://app.pagescms.org). Every field says where it shows up on the page.
- **Build:** `node build.js` renders every page from `src/template.html` + `content/*.json`. Netlify runs it on each deploy. Don't hand-edit the generated `.html` files.
- **Residents:** one file per cohort in `content/cohorts/`. The two newest cohorts show as current residents automatically, and all counts are calculated.
- **Forms:** the application, info request, and question forms are Netlify Forms. Notifications go to shannab@cccomaha.org (set in Netlify under Forms > Form notifications). The host family application and giving stay on Church Center.
- **Old URLs:** Squarespace paths redirect in `netlify.toml`.
