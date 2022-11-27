
variable "TAG" {
  default = "devel"
}

variable "DOCKER_ORGANIZATION" {
  default = "ultrachess"
}

target "ultrachess-deployer" {
  tags = ["${DOCKER_ORGANIZATION}/ultrachess-deployer:${TAG}"]
}
