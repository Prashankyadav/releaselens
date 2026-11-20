import {baseline, candidate, corrected} from './pricing.ts';
export const revisions = {candidate, corrected};
export const suite = [
  {name:'Below threshold', subtotal:900, delivery:0, expected:0},
  {name:'Qualifying basket', subtotal:1100, delivery:50, expected:100},
  {name:'Inclusive boundary', subtotal:1000, delivery:0, expected:100},
  {name:'Empty basket', subtotal:0, delivery:40, expected:0}
];
export type Case = {subtotal:number, delivery:number, expected:number};
export function evaluate(input: Case, revision: string) {
  if (!Object.hasOwn(revisions,revision)) throw Error('Unknown revision.');
  if (!input || ![input.subtotal,input.delivery].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000))
    throw Error('Amounts must be whole rupees between 0 and 1,000,000.');
  if (![0,100].includes(input.expected)) throw Error('Choose a predicted discount of ₹0 or ₹100.');
  const {subtotal,delivery,expected} = input;
  const previous = baseline(subtotal,delivery);
  const actual = revisions[revision as keyof typeof revisions](subtotal,delivery);
  return {subtotal,delivery,expected,previous,actual,pass:actual===expected};
}
