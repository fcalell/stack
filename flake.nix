{
  description = "stack dev shell — pnpm/turbo plugin monorepo (@fcalell/stack)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            # engines.node is ">=18"; node 24 matches the linked ../helm consumer.
            pkgs.nodejs_24
            # Provides the `pnpm` shim that honours packageManager (pnpm@10.32.1).
            pkgs.corepack

            # turbo runs check-types across the workspace (root `pnpm check`).
            pkgs.turbo

            # Formatter — biome.json drives `pnpm lint`; nvim resolves it on PATH.
            pkgs.biome

            # Project LSP servers — nvim's vim.lsp.enable picks these up on PATH.
            pkgs.vtsls # TypeScript / TSX
            pkgs.vscode-langservers-extracted # cssls, html, jsonls
            pkgs.tailwindcss-language-server # plugin-solid-ui tailwind surface
          ];

          shellHook = ''
            # Enable corepack so `pnpm` resolves to the repo-pinned version.
            export COREPACK_HOME="$PWD/.corepack"
            mkdir -p "$COREPACK_HOME"
            corepack enable --install-directory "$COREPACK_HOME" 2>/dev/null || true
            export PATH="$COREPACK_HOME:$PATH"

            echo "stack dev shell: node $(node --version), pnpm $(pnpm --version 2>/dev/null || echo 'run: pnpm')"
          '';
        };
      }
    );
}
