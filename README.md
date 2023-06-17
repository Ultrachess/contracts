## Yield-bearing LP SFTs (staked CHESS/ultra3CRV)

![Ultrachess screenshot](https://user-images.githubusercontent.com/15795328/217420293-bfca5517-c7bd-42bc-aa60-04ccb0bad0d8.png)

Non-zero-sum betting is based on Uniswap V3 LP NFTs staked in an SFT contract. The ERC-1155 standard is used for staking to allow for batch transfers of chess pieces, chess boards and chess play, so the top level of the tower is a yield-bearing LP SFT.

## Building

To build the Docker image, enter the project directory and run:

```
docker buildx bake -f docker-bake.hcl -f docker-bake.override.hcl --load
```
