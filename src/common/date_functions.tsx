export function checkDateDiff(startdtstr: string, enddtstr: string) {
  /**
   * Computes the number of months (with fraction) between start and end date
   */

  let num_days_diff = checkNumDaysBetweenYYYYMMDD(enddtstr, startdtstr);
  if (num_days_diff < 1.0) {
    return "Must be at least 1 month between Start and End Training dates";
  } else {
    return null;
  }
}

export function checkNumDaysBetweenYYYYMMDD(enddtstr: string, startdtstr: string): number {
  const enddt = new Date(Date.parse(enddtstr));
  const startdt = new Date(Date.parse(startdtstr));

  let month_difference =
    (enddt.getDate() - startdt.getDate()) / 30 + enddt.getMonth() - startdt.getMonth() + 12 * (enddt.getFullYear() - startdt.getFullYear());
  return month_difference;
}
