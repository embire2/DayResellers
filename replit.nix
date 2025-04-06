{pkgs}: {
  deps = [
    pkgs.nodejs
    pkgs.webkit
    pkgs.firefox
    pkgs.chromium
    pkgs.jq
    pkgs.postgresql
  ];
}
