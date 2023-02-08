/*
 * Copyright (C) 2022-2023 Ultrachess team
 * This file is part of Ultrachess - https://github.com/Ultrachess/contracts
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSE for more information.
 */

//
// LP NFT utility functions
//

function extractJSONFromURI(uri: string): {
  name: string;
  description: string;
  image: string;
} {
  const encodedJSON = uri.substr("data:application/json;base64,".length);
  const decodedJSON = Buffer.from(encodedJSON, "base64").toString("utf8");
  return JSON.parse(decodedJSON);
}

export { extractJSONFromURI };
