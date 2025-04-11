{
  inputs = { nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable"; };
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        buildInputs = with pkgs; [ git nodejs nodePackages.pnpm biome rustc cargo ];
      in with pkgs; { devShells.default = mkShell { inherit buildInputs; }; });
}
