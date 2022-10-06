
target "docker-metadata-action" {}

group "default" {
  targets = ["contract-deployer"]
}

target "contract-deployer" {
  inherits = ["docker-metadata-action"]
  context  = "."
  target   = "contract-deployer"
}
