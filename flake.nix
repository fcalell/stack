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

        default = pkgs.mkShell {
          packages = [
            # engines.node is ">=22.20" (`path.matchesGlob` is stable from it); node 24 matches the linked ../helm consumer.
            pkgs.nodejs_24
            # Provides the `pnpm` shim that honours packageManager (pnpm@11.28.3).
            pkgs.corepack

            # turbo runs check-types across the workspace (root `pnpm check`).
            pkgs.turbo

            # Formatter — biome.json drives `pnpm lint`; nvim resolves it on PATH.
            pkgs.biome

            # Project LSP servers — nvim's vim.lsp.enable picks these up on PATH.
            pkgs.vtsls # TypeScript / TSX
            pkgs.vscode-langservers-extracted # cssls, html, jsonls
            pkgs.tailwindcss-language-server # the web plugin's tailwind surface
          ];

          # Playwright's downloaded Chromium does not start on NixOS: the design critic's
          # Playwright tools run nixpkgs' browsers.
          PLAYWRIGHT_BROWSERS_PATH = pkgs.playwright-driver.browsers;
          PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "1";

          shellHook = ''
            # Enable corepack so `pnpm` resolves to the repo-pinned version.
            # Anchored at the repo root: a shell entered from a subdirectory
            # would otherwise install a second corepack home there.
            export COREPACK_HOME="$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")/.corepack"
            mkdir -p "$COREPACK_HOME"
            corepack enable --install-directory "$COREPACK_HOME" 2>/dev/null || true
            export PATH="$COREPACK_HOME:$PATH"

            # No `pnpm` call here: corepack would download a newly pinned pnpm with no
            # timeout, blocking direnv silently.
            echo "stack dev shell: node $(node --version)"
          '';
        };

        pkgsAndroid = import nixpkgs {
          inherit system;
          config = {
            allowUnfree = true;
            android_sdk.accept_license = true;
          };
        };
        # Versions follow react-native's gradle/libs.versions.toml (compileSdk 36, buildTools
        # 36.0.0, ndkVersion 27.1.12297006) plus AGP's default build-tools 35.0.0, which expo
        # modules build with. Bump them with react-native.
        android = pkgsAndroid.androidenv.composeAndroidPackages {
          platformVersions = [ "36" ];
          buildToolsVersions = [
            "35.0.0"
            "36.0.0"
          ];
          includeNDK = true;
          ndkVersions = [ "27.1.12297006" ];
          cmakeVersions = [ "3.22.1" ];
          includeEmulator = true;
          includeSystemImages = true;
          systemImageTypes = [ "google_apis" ];
          abiVersions = [ "x86_64" ];
          includeSources = false;
        };
        sdk = "${android.androidsdk}/libexec/android-sdk";

        # The phone render harness (plugins/expo/guide/phone-render.md). The system image is
        # x86_64 and runs on KVM, so the shell exists on x86_64 Linux only.
        phone = pkgs.mkShell {
          inputsFrom = [ default ];
          packages = [
            android.androidsdk
            pkgsAndroid.jdk17
            pkgs.maestro
            # The critique's pixel colours and contrast ratios, read from a screenshot.
            pkgs.imagemagick
          ];
          ANDROID_HOME = sdk;
          ANDROID_SDK_ROOT = sdk;
          JAVA_HOME = pkgsAndroid.jdk17.home;
          # The SDK is read-only, so Gradle fails on a missing component by name instead of
          # installing it. AGP's aapt2 from Maven is a foreign binary: run the SDK's patched one.
          GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${sdk}/build-tools/36.0.0/aapt2";
          MAESTRO_CLI_NO_ANALYTICS = "1";
          MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED = "true";
          # avdmanager writes under $XDG_CONFIG_HOME/.android when it is set, where the emulator
          # never looks: one home for both.
          shellHook = ''
            export ANDROID_USER_HOME="$HOME/.android"
          '';
        };
      in
      {
        devShells = {
          inherit default;
        }
        // pkgs.lib.optionalAttrs (system == "x86_64-linux") { inherit phone; };
      }
    );
}
