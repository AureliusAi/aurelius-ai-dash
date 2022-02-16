/**
 * converts a numeric unix timestamp into a string representation of a unix date time
 * @param unix_timestamp numeric - the unix date time
 * @returns string - formatted string representation of the date
 */
export const unix_to_datetime = (unix_timestamp: number) => {
  let dt = new Date(unix_timestamp);

  let year = dt.getFullYear();
  let month = String(dt.getMonth() + 1).padStart(2, "0");
  let day = String(dt.getDate()).padStart(2, "0");
  let hour = String(dt.getHours()).padStart(2, "0");
  let min = String(dt.getMinutes()).padStart(2, "0");
  let sec = String(dt.getSeconds()).padStart(2, "0");
  let ftime = year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;

  return ftime;
};
