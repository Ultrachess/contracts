
variable "TAG" {
  default = "devel"
}

variable "DOCKER_ORGANIZATION" {
  default = "ultrachess"
}

target "contract-deployer" {
  tags = ["${DOCKER_ORGANIZATION}/contract-deployer:${TAG}"]
}
