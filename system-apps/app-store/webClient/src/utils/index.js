export const trunc = (str, n) => str && str.length > n ? str.substring(0, n - 1) + '...' : str;
