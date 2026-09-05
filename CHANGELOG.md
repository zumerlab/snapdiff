### Changelog

All notable changes to this project will be documented in this file.

#### [v0.3.1](https://github.com/zumerlab/snapdiff/compare/v0.3.0...v0.3.1)

> 5 September 2026

- Refactor index.html and shared.css for improved design and functionality [`706a570`](https://github.com/zumerlab/snapdiff/commit/706a570beba9b7edfd202eb6df79cbc58474910c)
- Add snapDOM v3 compatibility and deterministic capture defaults [`959de6d`](https://github.com/zumerlab/snapdiff/commit/959de6d140e7ad35e4c178a3fe75d0a60500314b)
- Prepare snapDOM v3 and prerelease compatibility while retaining v2 support and pinning the auto CDN to v2.
- Share capture defaults across runner, auto, and iframe suites; retain defaults with partial overrides and force fresh v3 captures after CSSOM changes.
- Add browser integration coverage for installed or local snapDOM builds and document the v3 upgrade and baseline review workflow.

#### [v0.3.0](https://github.com/zumerlab/snapdiff/compare/v0.2.2...v0.3.0)

> 27 August 2026

- Suite: make artifact clearing and the report run-scoped, not per file [`7187b9b`](https://github.com/zumerlab/snapdiff/commit/7187b9b8e4a106133f354ca83619231879aa967d)


#### [v0.2.2](https://github.com/zumerlab/snapdiff/compare/v0.2.1...v0.2.2)

> 18 July 2026

- Report: reference baselines and artifacts relative to the report itself [`cfbbf6a`](https://github.com/zumerlab/snapdiff/commit/cfbbf6a8089ee84e1b27f249d61d230bf85a6f07)
- Update docs lib bundles for 0.2.1 [`5372412`](https://github.com/zumerlab/snapdiff/commit/5372412a7b9d0c3bd702d6650216f7404f049ad9)

#### [v0.2.1](https://github.com/zumerlab/snapdiff/compare/v0.2.0...v0.2.1)

> 18 July 2026

- update [`f96d5b0`](https://github.com/zumerlab/snapdiff/commit/f96d5b084fe5a2732d9ea4c47cd11a67ad80c90c)
- update [`009a03d`](https://github.com/zumerlab/snapdiff/commit/009a03dd9abadb177b8400ac242f4fc50b33373a)
- update [`21485fe`](https://github.com/zumerlab/snapdiff/commit/21485fe4e4034ac2cc9ac3ec604a1beff02818c4)
- update [`8727724`](https://github.com/zumerlab/snapdiff/commit/8727724fd1a9ba109d70785ca7222b8bd35d3d68)
- update [`02ee702`](https://github.com/zumerlab/snapdiff/commit/02ee7024527f44a68f770e2f81e454386ad0352d)
- update [`8ea5784`](https://github.com/zumerlab/snapdiff/commit/8ea5784975d54e82d8d0c1c75c34d08457f5f10b)
- Keep capture iframe in-viewport: WebKit suspends timers in offscreen iframes [`356b7d1`](https://github.com/zumerlab/snapdiff/commit/356b7d11924be8cd24bb10b03e907ed478a17566)
- update [`32f88ba`](https://github.com/zumerlab/snapdiff/commit/32f88baba497c503a9fd745635e100744cd275e9)
- update [`d6c5412`](https://github.com/zumerlab/snapdiff/commit/d6c5412087d5d4aab3fbbc68718378ddd0952f46)
- update [`74886e8`](https://github.com/zumerlab/snapdiff/commit/74886e8bec3d9111bc09a4f21a38e8f856bac728)
- Agregar demo de in-page para pruebas de regresión visual [`cf8f318`](https://github.com/zumerlab/snapdiff/commit/cf8f3187a25ef7ea1e2ca2c3824aa3cf5aaedf03)

#### [v0.2.0](https://github.com/zumerlab/snapdiff/compare/v0.1.0...v0.2.0)

> 5 May 2026

- Add zero-JS auto-discover bundle and snapdiff-stale CLI [`27bacc1`](https://github.com/zumerlab/snapdiff/commit/27bacc148d49f79fb2ddcef1bd0a8512f71bb035)
- Bump esbuild to ^0.25.0 to clear GHSA-67mh-4wv8-2f99 [`b56978e`](https://github.com/zumerlab/snapdiff/commit/b56978e2f5e8861986d96ac94466fa7e6d0378ed)

#### v0.1.0

> 5 May 2026

- Initial commit: snapDiff v0.1.0 [`b27517c`](https://github.com/zumerlab/snapdiff/commit/b27517c5b1f01936e8bf6cf4f5044b7fb9a9e196)
