# Contributing to Flowsint Desktop

Thank you for your interest in contributing! Flowsint Desktop is a community project and all contributions are welcome.

## Ways to contribute

- **Report bugs** — Open an issue describing what happened, what you expected, and your OS/Docker version.
- **Suggest features** — Open an issue with the `enhancement` label.
- **Submit a pull request** — Fork the repository, create a branch, make your changes, and open a PR.

## Development setup

See the [Building from source](README.md#building-from-source) section in the README.

## Guidelines

- Keep pull requests focused — one feature or fix per PR.
- Follow existing code style (TypeScript with strict types, Rust with `cargo fmt` / `cargo clippy`).
- Test your changes with Docker Desktop running on the target platform.
- If your change affects the startup flow, test both first-run and subsequent-run scenarios.

## License

By contributing, you agree that your contributions will be licensed under the **GNU AGPLv3**.

## Reporting security issues

Please **do not** open a public issue for security vulnerabilities. Contact the maintainers directly.

---

> Note: This project wraps [Flowsint](https://github.com/reconurge/flowsint). For bugs or feature requests related to the Flowsint application itself (API, enrichers, graph UI), please open an issue on the [Flowsint repository](https://github.com/reconurge/flowsint) instead.
