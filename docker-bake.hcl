
target "docker-metadata-action" {}

group "default" {
  targets = ["ultrachess-deployer"]
}

target "ultrachess-deployer" {
  inherits = ["docker-metadata-action"]
  context  = "."
  target   = "ultrachess-deployer"
}
