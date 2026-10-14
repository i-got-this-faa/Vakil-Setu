# Fleet reference

- Source: https://github.com/jr4dh3y/fleet
- Local checkout: `vendor/fleet`
- Revision inspected: `7753a3eb43337f735a3af234413f2a2d7ff95276`
- Date: 2026-10-14
- Restore: `git clone https://github.com/jr4dh3y/fleet.git vendor/fleet` from the rebuild directory, then `git -C vendor/fleet checkout 7753a3eb43337f735a3af234413f2a2d7ff95276`.

Fleet is excluded from the application Git tree and workspace dependency graph. The reference checkout has its own Git history. Its relevant instructions are linked in `AGENTS.md`; user and rebuild instructions take precedence. No remote skill is treated as permission to disclose credentials or publish data.
