with import <nixpkgs> {};

stdenv.mkDerivation rec {
    name = "rg-node";
    buildInputs = [
        pkgs.nodejs-14_x
    ];

    env = buildEnv {
        name = name;
        paths = buildInputs;
    };

    shellHook = "export PS1='\n\\[\\033[01;32m\\][nix rg-node] \\w\\$\\[\\033[00m\\] '";
}
