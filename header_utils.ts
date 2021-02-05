type unknownHeadersType =
  | Headers
  | string[][]
  | Record<string, string>
  | undefined;

function isHeadersOfTypeHeaders(
  headers: unknownHeadersType,
): headers is Headers {
  if (headers && "append" in headers && typeof headers.append === "function") {
    return true;
  }
  return false;
}

function isHeadersOfTypeArray(
  headers: unknownHeadersType,
): headers is string[][] {
  if (!isHeadersOfTypeHeaders(headers) && Array.isArray(headers)) {
    return true;
  }
  return false;
}

function isHeadersOfTypeObject(
  headers: unknownHeadersType,
): headers is Record<string, string> {
  if (!isHeadersOfTypeArray(headers) && typeof headers === "object") {
    return true;
  }
  return false;
}

export function getHeader(
  headers: Headers | string[][] | Record<string, string> | undefined,
  name: string,
): string | null {
  if (isHeadersOfTypeHeaders(headers)) {
    return headers.get(name);
  } else if (isHeadersOfTypeArray(headers)) {
    for (const [hName, hValue] of headers) {
      if (hName.toLowerCase() === name.toLowerCase()) {
        return hValue;
      }
    }
    return null;
  } else if (isHeadersOfTypeObject(headers)) {
    for (const hName of Object.keys(headers)) {
      if (hName.toLowerCase() === name.toLowerCase()) {
        return headers[hName];
      }
    }
  }
  return null;
}

export function setHeader(
  headers: Headers | string[][] | Record<string, string> | undefined,
  /** Header name */
  name: string,
  /** Header value */
  value: string,
) {
  if (isHeadersOfTypeHeaders(headers)) {
    headers.set(name, value);
  } else if (isHeadersOfTypeArray(headers)) {
    let found = false;
    for (const [index, [hName]] of headers.entries()) {
      if (hName.toLowerCase() === name.toLowerCase()) {
        headers[index][0] = name;
        headers[index][1] = value;
        found = true;
        break;
      }
    }
    if (!found) {
      headers.push([name, value]);
    }
  } else if (isHeadersOfTypeObject(headers)) {
    let found = false;
    for (const hName of Object.keys(headers)) {
      if (hName.toLowerCase() === name.toLowerCase()) {
        delete headers[hName];
        headers[name] = value;
        found = true;
        break;
      }
    }
    if (!found) {
      headers[name] = value;
    }
  }
}

export function appendHeader(
  headers: Headers | string[][] | Record<string, string> | undefined,
  /** Header name */
  name: string,
  /** Header value */
  value: string,
) {
  if (isHeadersOfTypeHeaders(headers)) {
    headers.append(name, value);
  } else {
    let newValue = getHeader(headers, name) || "";
    if (!newValue) {
      newValue += value;
    } else {
      newValue += ", " + value;
    }
    setHeader(headers, name, newValue);
  }
}

export function deleteHeader(
  headers: Headers | string[][] | Record<string, string> | undefined,
  name: string,
) {
  if (isHeadersOfTypeHeaders(headers)) {
    return headers.delete(name);
  } else if (isHeadersOfTypeArray(headers)) {
    for (const [index, [hName]] of headers.entries()) {
      if (hName.toLowerCase() === name.toLowerCase()) {
        headers.splice(index, 1);
        return;
      }
    }
    return null;
  } else if (isHeadersOfTypeObject(headers)) {
    for (const hName of Object.keys(headers)) {
      if (hName.toLowerCase() === name.toLowerCase()) {
        delete headers[hName];
        return;
      }
    }
  }
}
