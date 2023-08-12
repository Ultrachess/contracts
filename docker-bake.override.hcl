
variable "TAG" {
  default = "1.0.2"
}

variable "DOCKER_ORGANIZATION" {
  default = "juztamau5"
}

target "ultrachess-deployer" {
  tags = ["${DOCKER_ORGANIZATION}/ultrachess-deployer:${TAG}"]
}
