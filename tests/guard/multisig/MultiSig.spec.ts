import MultiSigHandler from '../../../src/guard/multisig/MultiSig';
import { expect } from 'chai';
import sinon from 'sinon';
import { sendMessageBodyAndPayloadArguments } from '../../communication/mocked/MockedDialer';
import * as wasm from 'ergo-lib-wasm-nodejs';
import MultiSigUtils from '../../../src/guard/multisig/MultiSigUtils';
import Utils from '../../../src/helpers/Utils';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const publicKeys = [
  '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb8',
  '03074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364',
  '0300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee410',
  '023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e',
];

const signedTrnasction =
  'BmIi2lP4Iiz9qPpbCweVapU72gob04nbT1/cN5KiMBcxAAAMJkmFsG9nu+ASHQXUj4S+yAPND+CSdTcupcNm90CmGKADQU0dUYITTs9nKPzoiBPQjqq89N7Hbqbq+QI5sPJa0tXlfn85DSPVfN/DkoPPl1Lm40+XAkRSnK8pPBcKNc2CcvjuCEfpu6vN2cSq1vab+CpS53G8SPRPhU+nYCfkpJuhQ5NRQXCNjwpPzmYV5EMkVp3l1P3VlGSxyq5vcqWHYubu0m7iX9G6XYPbpjqLFV/IAMEQcNp6b37/IH/QuqgY0J85+oVVo3OFIDkSVRetfQade3xTP1DyZX8QKFb6A6gWhjOXLgxNKi3loYAiVNIWeXQvCjeowtwW/N9IYkxrym1A9mrETGCZE43j8lGnQbKmzt0oTiBbn1Jqid+sIN1gntn8kngjgPKDCVj1FQjXvqYX5LIEjvn9DIE9dW3D3LkfLcvueO4FPd+C+zdlbYtpAbkSOA5fmdh42DD50o+q4PMXIMF4nK7KBl1cfkXKsdDvr5/wdNYHIg2wxBQwuBvMjB+WS96XhlasI0WXlT6fzp9IrEDWo9Kb3/fs85W5eI4/+nBhatfdJoU4iHx7vbrWm8atLmUL11OwZ3nX1CevFt0AK8rMIq5mBzJhv9VIsgs6CAZ4OUWyp9wlNem53oBSQPSgAwdFaLrzGMORwwh2FLKJavtrjknC1lV8XeZCZYrK2h2rGgt1V0jkMTQV6MlQQGbEffnS5Gx8ZIv4REKZ4PaZ8FqN7sBYl+pqjVTYE0zbiIFQwGe8o+InHQLf8t1eDKTadPiHaBmolKE3QXbWKrwpFCxJjFAlJUCRa3w/Yh2cD9y+IoHmRZOJGlwJGFHq9JQJmVTKZhHBxH63IAI4bjkaCTBT11oyYGk8zCcKa1CO1Cqs6/k1aAGvU1VpLfDPTDHVcAXl3BdwLR5nYbIS+xEXaEly8nJaaw3GFyNPkQnX73R1XxMX30tG2HBlnyeGxUF9zVWwG9diLHWJ0dx9wbs32TMlV9ihRoWjYpI2CfTbyOIjvYmoUHu7yk68+z+ZGAjzwZ2TkSaFNBD8THXD6g6A7qf4Hel5yR4tPieZHa4exlwo4nNiVHvhjDKZGksisoLYGYNVGRuMmb1dppQ1xlsbu44iJERIjy057rYzXvbni5KR6vC5GwvzQEbZ0u2q/c24YeVtrc7D9H2UlEz80kvVxH61a4n6FlWbjCLHFQQ5eKQrAA4g4XujGtc/7VJnHRo5VAqcqFhdZyl2q2D1h2QMO0GaoAOWp/SJz3uqa/dLyH47TQDJtjCCXJnNffvE8yzt4yndNojQgoVekfihYduPVs3CxfXm0MRqG4i7xr/+RtaAsNKO2mFr3YfGHaBlm/VcAJJ08QBULqqy6mfeblyZgu7ResveAwOGpR39IxT257gq0XRCh0uqFitWMZt8j3A7oI9mjjXqH1rVzl9oXhlparyz/euST1/00Gk+ZTDxTLp5ZLiwUrHECqk3cRtiYEXsovVZxn4QJnDC5LeVYyyTWLKwdk69lQytbxaTolHuPjZmsiaYuuH63qDYvLHM3Vla3/JIaJRBLgVIpuc56xP8aDaPKBxAo2uKZJqA2qQz+4XWa4kc6Qe4sluFuPXCEVgY0t8WA24ktJMWCzMMxi4+uPPFA2ZwXFKYnGH0pdlzMgqMxPz/B1LR5qvDYp8RyigAo7E5iCExwbuKWDTAxjOZc+cge/XeAhfKphe3AysgZw/gfN2RL23XaYQEGqWs1bbWdT2GqknReV4Q/q2EFSGEZ1qOL+CNnSUe46X1kJhmS/fanuII9aCcbkTO7NUM3lSNyOqFwACcfmJZOXr8jwBAdWZdeKBzfVMWb4UPRP8i+N958fZtdKADgH+5b7an/T2X/HNnIK6fPlcyYmO9Pn3M2ZcqxFE7QPRybnLw179mbLzXSHvF2GIY6VDXPVIFwGN6GX9wdeoztKTbrNmBILP8xakTmqVmJ8ziVqVMVO1b6Okf9FUcHhZtrmsLycyqF9qYM0tQsjVD4/pN6OPP0DcBlzy7/uhFuyPhOOtaWxyQmC4MnTzGrB6wyBs3sKdQVueYsTHyVznWaXpEr1BGRFz+idljTxTUjLYPTfVIWK2JLWC/195zLXX/I/WkAxUCsnVt4GMfe7jXRltPFNOlgjiLLHy40M7xH9jd0vSibHlzm6bqx1x79Z+rpuVUSet4FLNeosmaXhxzZs0k8bj/JxeEZnIg52ofOULdsgvGf+TDAtqE/LLcXH/9SyL7Xmk4xvFkQWVp761l1wG/iVh/bTzzkI4Ebdc+rAlICqEUMkd71ZRgMI41Tgv9SJ4FWLXGwFUSOFU7XWKHiHfjWiHA4SOXb4TfR8D7XCUSKWaIzzsUSG073UvafUpYfcic12SzMD3kUi1lvDgzd6436xXJKoeoy3UzjbkGfv0AfSfmvZn/s0uQlLlCPoke0B8LznCuI6b6BMYn9FZY7fSgA7Ko9NBVlv42tuTit+utTkSJjjXcCQElOCqrsN0+1qJJ1wWtHVtsWtX8gwRj1ovVzirK5lCKUjJ3wJqP0Vyeo5u9Sc6O0EoUwRs/XV5q0xaKvx6tXkA9ZAFyO1XREFdRyOvb3lqBebFbtCFhi2sChmjizflaL5Fi0T70L/Z0V0ZqoDlFmw4BwtR+fUHyv/0XDnrsuiDGmnHUO4GuzuK2ncxFhN76oo5sSvHGIGqwscNdU5LkOYBlpwYheUpsvWMduwGSlCzcwTwouiUYO/6ahh2U0kkqeXSlC/aF4Y8bHJ2xLUBpRYFJhnBKbMmZIwzlLDcBo5/UAWfxdp/FJqrNFwOk024iTNbEINVQpxUs9uqB19kwBt1CYSE6YFob/JE9i//YtaM1OmuonPjJi1ISbK4vWEDOag1bHoe+pxiDH754C2myP7qgaOVVwtsT5+EAL0I7IVivjsP5i4lk6BMCLSCpEwzC3dF45FvT1fpTrJUSfBB2r5NUEk1EDFiuzWdC0BkXW9IXvZj5COau9ZxcZFs//l+jOaGZ4tsDK5Nc6FieAAE1C/90kaqb+CipIv2PUN8BkcauWGywd9hLnK713ZbPvAQ4PXCrCDzCMzakY3D+cwssUdsOgxWGttVFICy8M5OO4RAnjBAr+JD9q471ER6UBTyQs1QbwlsN4u6KpjBczsPe/GwgcOsAT8CPzeFRTe5WsdBYdHd0jYr2RxebCY9S9VlRfJG06mgBZt3T9nsnsCdMILvSrrgrYOr1v1Rxs39oSg7gpxIQEwQABAAEBAQABAIEAA4gOsipDQqoxcUOmd0liKmQ/Te1067nDjLVYkH0HtSenwMEBAQABAAEAAEBBAIEAAQABAAOICYINlj84q5bmEitALfXKHjKhDlKRylEYNEcQ/obrnONBQIBAdgH1gGypXMAANYCjLLbYwincwEAAdYDrrW0pXMCsaXZAQNjkbHbYwhyA3MD2QEDY67bYwhyA9kBBU0Ok4xyBQFyAtYE5ManBBrWBbKlcwQA1gbbYwhyBdYHrnIG2QEHTQ6TjHIHAXIClZOMsttjCHIBcwUAAXMG0ZaDAwHvcgOTjLLbYwiypHMHAHMIAAGycgRzCQCVcgeWgwIBk4yycgZzCgABcgKTwnIFwqdzC9gB1gjCp9GWgwUB73IDk8JyAXIIk+TGcgEEGnIEk4yy22MIsqRzDABzDQABsnIEcw4AlXIH2AHWCbJyBnMPAJaDBwGTjHIJAXICk8vCcgVzEObGcgUFGubGcgUGDpPkxnIFBw7LcgiT5MZyBQQacgSTjHIJAnMRcxLsqjkCAAEB2AQBGgEghG9yY3t19IF+s/boVCyy2Sh1zx3c4P1bc0/HybtIrGDgpxIQEwQABAAEBAQABAIEAA4gOsipDQqoxcUOmd0liKmQ/Te1067nDjLVYkH0HtSenwMEBAQABAAEAAEBBAIEAAQABAAOICYINlj84q5bmEitALfXKHjKhDlKRylEYNEcQ/obrnONBQIBAdgH1gGypXMAANYCjLLbYwincwEAAdYDrrW0pXMCsaXZAQNjkbHbYwhyA3MD2QEDY67bYwhyA9kBBU0Ok4xyBQFyAtYE5ManBBrWBbKlcwQA1gbbYwhyBdYHrnIG2QEHTQ6TjHIHAXIClZOMsttjCHIBcwUAAXMG0ZaDAwHvcgOTjLLbYwiypHMHAHMIAAGycgRzCQCVcgeWgwIBk4yycgZzCgABcgKTwnIFwqdzC9gB1gjCp9GWgwUB73IDk8JyAXIIk+TGcgEEGnIEk4yy22MIsqRzDABzDQABsnIEcw4AlXIH2AHWCbJyBnMPAJaDBwGTjHIJAXICk8vCcgVzEObGcgUFGubGcgUGDpPkxnIFBw7LcgiT5MZyBQQacgSTjHIJAnMRcxLsqjkCAAEB2AQBGgEgwfWqSxpxM5amP1Vt9Jxwrdk7NHHLyok8YUb85aS5XnbgpxIQEwQABAAEBAQABAIEAA4gOsipDQqoxcUOmd0liKmQ/Te1067nDjLVYkH0HtSenwMEBAQABAAEAAEBBAIEAAQABAAOICYINlj84q5bmEitALfXKHjKhDlKRylEYNEcQ/obrnONBQIBAdgH1gGypXMAANYCjLLbYwincwEAAdYDrrW0pXMCsaXZAQNjkbHbYwhyA3MD2QEDY67bYwhyA9kBBU0Ok4xyBQFyAtYE5ManBBrWBbKlcwQA1gbbYwhyBdYHrnIG2QEHTQ6TjHIHAXIClZOMsttjCHIBcwUAAXMG0ZaDAwHvcgOTjLLbYwiypHMHAHMIAAGycgRzCQCVcgeWgwIBk4yycgZzCgABcgKTwnIFwqdzC9gB1gjCp9GWgwUB73IDk8JyAXIIk+TGcgEEGnIEk4yy22MIsqRzDABzDQABsnIEcw4AlXIH2AHWCbJyBnMPAJaDBwGTjHIJAXICk8vCcgVzEObGcgUFGubGcgUGDpPkxnIFBw7LcgiT5MZyBQQacgSTjHIJAnMRcxLsqjkCAAEB2AQBGgEg45BH+nAl9euU8LGp1tRyi1pCcOoRVeTlsOJl20ZYnVzgpxIQEwQABAAEBAQABAIEAA4gOsipDQqoxcUOmd0liKmQ/Te1067nDjLVYkH0HtSenwMEBAQABAAEAAEBBAIEAAQABAAOICYINlj84q5bmEitALfXKHjKhDlKRylEYNEcQ/obrnONBQIBAdgH1gGypXMAANYCjLLbYwincwEAAdYDrrW0pXMCsaXZAQNjkbHbYwhyA3MD2QEDY67bYwhyA9kBBU0Ok4xyBQFyAtYE5ManBBrWBbKlcwQA1gbbYwhyBdYHrnIG2QEHTQ6TjHIHAXIClZOMsttjCHIBcwUAAXMG0ZaDAwHvcgOTjLLbYwiypHMHAHMIAAGycgRzCQCVcgeWgwIBk4yycgZzCgABcgKTwnIFwqdzC9gB1gjCp9GWgwUB73IDk8JyAXIIk+TGcgEEGnIEk4yy22MIsqRzDABzDQABsnIEcw4AlXIH2AHWCbJyBnMPAJaDBwGTjHIJAXICk8vCcgVzEObGcgUFGubGcgUGDpPkxnIFBw7LcgiT5MZyBQQacgSTjHIJAnMRcxLsqjkCAAEB2AQBGgEg1OA+2lijOPj2W0DeJYQH29u9m4zMo3T2a+jZflLIp1LgpxIQEwQABAAEBAQABAIEAA4gOsipDQqoxcUOmd0liKmQ/Te1067nDjLVYkH0HtSenwMEBAQABAAEAAEBBAIEAAQABAAOICYINlj84q5bmEitALfXKHjKhDlKRylEYNEcQ/obrnONBQIBAdgH1gGypXMAANYCjLLbYwincwEAAdYDrrW0pXMCsaXZAQNjkbHbYwhyA3MD2QEDY67bYwhyA9kBBU0Ok4xyBQFyAtYE5ManBBrWBbKlcwQA1gbbYwhyBdYHrnIG2QEHTQ6TjHIHAXIClZOMsttjCHIBcwUAAXMG0ZaDAwHvcgOTjLLbYwiypHMHAHMIAAGycgRzCQCVcgeWgwIBk4yycgZzCgABcgKTwnIFwqdzC9gB1gjCp9GWgwUB73IDk8JyAXIIk+TGcgEEGnIEk4yy22MIsqRzDABzDQABsnIEcw4AlXIH2AHWCbJyBnMPAJaDBwGTjHIJAXICk8vCcgVzEObGcgUFGubGcgUGDpPkxnIFBw7LcgiT5MZyBQQacgSTjHIJAnMRcxLsqjkCAAEB2AQBGgEgcwSIEZ8iOCLHfJyJ+nPheUEW3RUD/Kvz/JIX/+e3tQjgpxIQEwQABAAEBAQABAIEAA4gOsipDQqoxcUOmd0liKmQ/Te1067nDjLVYkH0HtSenwMEBAQABAAEAAEBBAIEAAQABAAOICYINlj84q5bmEitALfXKHjKhDlKRylEYNEcQ/obrnONBQIBAdgH1gGypXMAANYCjLLbYwincwEAAdYDrrW0pXMCsaXZAQNjkbHbYwhyA3MD2QEDY67bYwhyA9kBBU0Ok4xyBQFyAtYE5ManBBrWBbKlcwQA1gbbYwhyBdYHrnIG2QEHTQ6TjHIHAXIClZOMsttjCHIBcwUAAXMG0ZaDAwHvcgOTjLLbYwiypHMHAHMIAAGycgRzCQCVcgeWgwIBk4yycgZzCgABcgKTwnIFwqdzC9gB1gjCp9GWgwUB73IDk8JyAXIIk+TGcgEEGnIEk4yy22MIsqRzDABzDQABsnIEcw4AlXIH2AHWCbJyBnMPAJaDBwGTjHIJAXICk8vCcgVzEObGcgUFGubGcgUGDpPkxnIFBw7LcgiT5MZyBQQacgSTjHIJAnMRcxLsqjkCAAEB2AQBGgEg4Jkh0Kh7tj6UqmB0wJCpA6KA69jPuoYjluVmaPcTj+HgpxIQEwQABAAEBAQABAIEAA4gOsipDQqoxcUOmd0liKmQ/Te1067nDjLVYkH0HtSenwMEBAQABAAEAAEBBAIEAAQABAAOICYINlj84q5bmEitALfXKHjKhDlKRylEYNEcQ/obrnONBQIBAdgH1gGypXMAANYCjLLbYwincwEAAdYDrrW0pXMCsaXZAQNjkbHbYwhyA3MD2QEDY67bYwhyA9kBBU0Ok4xyBQFyAtYE5ManBBrWBbKlcwQA1gbbYwhyBdYHrnIG2QEHTQ6TjHIHAXIClZOMsttjCHIBcwUAAXMG0ZaDAwHvcgOTjLLbYwiypHMHAHMIAAGycgRzCQCVcgeWgwIBk4yycgZzCgABcgKTwnIFwqdzC9gB1gjCp9GWgwUB73IDk8JyAXIIk+TGcgEEGnIEk4yy22MIsqRzDABzDQABsnIEcw4AlXIH2AHWCbJyBnMPAJaDBwGTjHIJAXICk8vCcgVzEObGcgUFGubGcgUGDpPkxnIFBw7LcgiT5MZyBQQacgSTjHIJAnMRcxLsqjkCAAEB2AQBGgEg7WuLY9GHGY87pVRoIxtcg8BQ9yczZCEfzzscp1Jv8wLgpxIQEwQABAAEBAQABAIEAA4gOsipDQqoxcUOmd0liKmQ/Te1067nDjLVYkH0HtSenwMEBAQABAAEAAEBBAIEAAQABAAOICYINlj84q5bmEitALfXKHjKhDlKRylEYNEcQ/obrnONBQIBAdgH1gGypXMAANYCjLLbYwincwEAAdYDrrW0pXMCsaXZAQNjkbHbYwhyA3MD2QEDY67bYwhyA9kBBU0Ok4xyBQFyAtYE5ManBBrWBbKlcwQA1gbbYwhyBdYHrnIG2QEHTQ6TjHIHAXIClZOMsttjCHIBcwUAAXMG0ZaDAwHvcgOTjLLbYwiypHMHAHMIAAGycgRzCQCVcgeWgwIBk4yycgZzCgABcgKTwnIFwqdzC9gB1gjCp9GWgwUB73IDk8JyAXIIk+TGcgEEGnIEk4yy22MIsqRzDABzDQABsnIEcw4AlXIH2AHWCbJyBnMPAJaDBwGTjHIJAXICk8vCcgVzEObGcgUFGubGcgUGDpPkxnIFBw7LcgiT5MZyBQQacgSTjHIJAnMRcxLsqjkCAAEB2AQBGgEg2gbyb1XMoK0GiA4Oj+QNQBE3PlJvaq/kfKuo9foWlwfgpxIQEwQABAAEBAQABAIEAA4gOsipDQqoxcUOmd0liKmQ/Te1067nDjLVYkH0HtSenwMEBAQABAAEAAEBBAIEAAQABAAOICYINlj84q5bmEitALfXKHjKhDlKRylEYNEcQ/obrnONBQIBAdgH1gGypXMAANYCjLLbYwincwEAAdYDrrW0pXMCsaXZAQNjkbHbYwhyA3MD2QEDY67bYwhyA9kBBU0Ok4xyBQFyAtYE5ManBBrWBbKlcwQA1gbbYwhyBdYHrnIG2QEHTQ6TjHIHAXIClZOMsttjCHIBcwUAAXMG0ZaDAwHvcgOTjLLbYwiypHMHAHMIAAGycgRzCQCVcgeWgwIBk4yycgZzCgABcgKTwnIFwqdzC9gB1gjCp9GWgwUB73IDk8JyAXIIk+TGcgEEGnIEk4yy22MIsqRzDABzDQABsnIEcw4AlXIH2AHWCbJyBnMPAJaDBwGTjHIJAXICk8vCcgVzEObGcgUFGubGcgUGDpPkxnIFBw7LcgiT5MZyBQQacgSTjHIJAnMRcxLsqjkCAAEB2AQBGgEgEB9fCZXZDICpSRgVVx7RyfxVIpIvo7vMvVddGqclX5DgpxIQEwQABAAEBAQABAIEAA4gOsipDQqoxcUOmd0liKmQ/Te1067nDjLVYkH0HtSenwMEBAQABAAEAAEBBAIEAAQABAAOICYINlj84q5bmEitALfXKHjKhDlKRylEYNEcQ/obrnONBQIBAdgH1gGypXMAANYCjLLbYwincwEAAdYDrrW0pXMCsaXZAQNjkbHbYwhyA3MD2QEDY67bYwhyA9kBBU0Ok4xyBQFyAtYE5ManBBrWBbKlcwQA1gbbYwhyBdYHrnIG2QEHTQ6TjHIHAXIClZOMsttjCHIBcwUAAXMG0ZaDAwHvcgOTjLLbYwiypHMHAHMIAAGycgRzCQCVcgeWgwIBk4yycgZzCgABcgKTwnIFwqdzC9gB1gjCp9GWgwUB73IDk8JyAXIIk+TGcgEEGnIEk4yy22MIsqRzDABzDQABsnIEcw4AlXIH2AHWCbJyBnMPAJaDBwGTjHIJAXICk8vCcgVzEObGcgUFGubGcgUGDpPkxnIFBw7LcgiT5MZyBQQacgSTjHIJAnMRcxLsqjkCAAEB2AQBGgEg0gbW83vGP64m+7WR1dS2AYHbNftxKubfosX68AeNZuvA9vddAAjNAtC3W8mXdRGV0UNnHMEOilkPJbmH8rLdDZnMX0jGlm097Ko5AQGwbQDAhD0ACM0DzHbxB0pEd803gynE6QLuYUWt1y6cJsgrTyJV52jUiBHsqjkAAOLNzZVJEAMEAA4gqWuASfB0HHJVtgzwGVRDnS5LLRmufY68aI7LGQoztTgEANgB1gGy22UB/nMAAOoC0a7bYwhyAdkBAk0Ok4xyAgFzAZiy5MZyAQUQcwIAreTGcgEEGtkBAg7N7nIC7Ko5AwLp1pv+AwPHugUBxqRYAOCRQxAFBAAEAA42EAIEoAsIzQJ5vmZ++dy7rFWgYpXOhwsHApv82y3OKNlZ8oFbFvgXmOoC0ZKjmozHpwFzAHMBEAECBALRloMDAZOjjMeypXMAAAGTwrKlcwEAdHMCcwODAQjN7qyTsaVzBOyqOQAA';

describe('MultiSigHandler', () => {
  describe('sendMessage', () => {
    /**
     * Target: testing that sendMessage send message with specific keys
     *
     * Dependencies:
     *  -
     *
     *  Expected:
     *      the sendMessage should send json string that have "sign" & "payload" key in the main body
     *          and have "index", "id", "nonce" and "myId" in the payload key object.
     */
    it('should send message with specific keys that written in test doc string', () => {
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      sendMessageBodyAndPayloadArguments(
        ['sign'],
        ['index', 'id', 'nonce', 'myId']
      );
      handler.sendMessage({
        type: 'approve',
        payload: {
          nonce: 'nonce',
          myId: 'peerId',
          nonceToSign: 'nonceToSign',
        },
      });
    });
  });

  describe('getIndex', () => {
    /**
     * Target: testing getIndex returns correct index of the gaurde
     * Dependencies:
     *  -
     *  Expected:
     *      that getIndex should return 0
     */
    it('should returns 0', () => {
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      expect(handler.getIndex()).to.be.equal(0);
    });
  });

  describe('getProver', () => {
    /**
     * Target: testing getProver runs with no error
     * Dependencies:
     *  -
     *  Expected:
     *      getProver throw no error
     */
    it('should runs with no error', () => {
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      handler.getProver();
    });
  });

  describe('handleApprove', () => {
    /**
     * Target: testing handleApprove should send json message with specific keys
     * Dependencies:
     *  -
     *  Expected:
     *      handleApprove should send json message with 'type', 'sign', 'payload' body key
     *      'nonceToSign' payload key
     */
    it('should send message with specific keys that written in test doc string', () => {
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      handler.handleApprove('sender', {
        index: 1,
        nonce: 'nonce',
        myId: 'sender',
        nonceToSign: '1',
      });
      sendMessageBodyAndPayloadArguments(
        ['type', 'sign', 'payload'],
        ['nonceToSign']
      );
    });
  });

  describe('handleMessage', () => {
    /**
     * Target: testing handleMessage calling correct handle function
     * Dependencies:
     *  -
     *  Expected: handleCommitment called and other handlers don't call
     */
    it('should call handleCommitment handle function', () => {
      const handler = new MultiSigHandler(
        publicKeys,
        '168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f'
      );
      const message =
        '{"type":"commitment","payload":{"txId":"356ebd85f01ee25c3c241950b77d533ee46bcdc7c3a02a2f24bb25946b9fec96","commitment":{"0":[{"a":"02acf3bf8466386df1cedca127ac8e025223ce1f88f430fc6f1dfabc424857e15c","position":"0-1"}]},"index":1,"id":"12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2"},"sign":"+nHOaX5etrB+JI3tMa+EfSsBX7tBKhALubQ7D3iLl4VuzsXFOFfkgpas8tPm5/nrElGW5Y4CpzB+DuWAEvK1sA=="}';
      const spiedCommitment = sinon.spy(handler, 'handleCommitment');
      const spiedSign = sinon.spy(handler, 'handleSign');
      const spiedRegister = sinon.spy(handler, 'handleRegister');
      const spiedApprove = sinon.spy(handler, 'handleApprove');
      handler.handleMessage(
        message,
        'multi-sig',
        '12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2'
      );
      expect(spiedCommitment.calledOnce).to.be.true;
      expect(spiedSign.called).to.be.false;
      expect(spiedApprove.called).to.be.false;
      expect(spiedRegister.called).to.be.false;
    });

    /**
     * Target: testing handleMessage calling correct handle function
     * Dependencies:
     *  -
     *  Expected: handleApprove called and other handlers don't call
     */
    it('should call handleApprove handle function', () => {
      const handler = new MultiSigHandler(
        publicKeys,
        '168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f'
      );
      const message =
        '{"type":"approve","payload":{"txId":"356ebd85f01ee25c3c241950b77d533ee46bcdc7c3a02a2f24bb25946b9fec96","commitment":{"0":[{"a":"02acf3bf8466386df1cedca127ac8e025223ce1f88f430fc6f1dfabc424857e15c","position":"0-1"}]},"index":1,"id":"12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2"},"sign":"+nHOaX5etrB+JI3tMa+EfSsBX7tBKhALubQ7D3iLl4VuzsXFOFfkgpas8tPm5/nrElGW5Y4CpzB+DuWAEvK1sA=="}';
      const spiedCommitment = sinon.spy(handler, 'handleCommitment');
      const spiedSign = sinon.spy(handler, 'handleSign');
      const spiedRegister = sinon.spy(handler, 'handleRegister');
      const spiedApprove = sinon.spy(handler, 'handleApprove');
      handler.handleMessage(
        message,
        'multi-sig',
        '12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2'
      );
      expect(spiedApprove.calledOnce).to.be.true;
      expect(spiedSign.called).to.be.false;
      expect(spiedCommitment.called).to.be.false;
      expect(spiedRegister.called).to.be.false;
    });

    /**
     * Target: testing handleMessage calling correct handle function
     * Dependencies:
     *  -
     *  Expected: handleRegister called and other handlers don't call
     */
    it('should call handleRegister handle function', () => {
      const handler = new MultiSigHandler(
        publicKeys,
        '168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f'
      );
      const message =
        '{"type":"register","payload":{"txId":"356ebd85f01ee25c3c241950b77d533ee46bcdc7c3a02a2f24bb25946b9fec96","commitment":{"0":[{"a":"02acf3bf8466386df1cedca127ac8e025223ce1f88f430fc6f1dfabc424857e15c","position":"0-1"}]},"index":1,"id":"12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2"},"sign":"+nHOaX5etrB+JI3tMa+EfSsBX7tBKhALubQ7D3iLl4VuzsXFOFfkgpas8tPm5/nrElGW5Y4CpzB+DuWAEvK1sA=="}';
      const spiedCommitment = sinon.spy(handler, 'handleCommitment');
      const spiedSign = sinon.spy(handler, 'handleSign');
      const spiedRegister = sinon.spy(handler, 'handleRegister');
      const spiedApprove = sinon.spy(handler, 'handleApprove');
      handler.handleMessage(
        message,
        'multi-sig',
        '12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2'
      );
      expect(spiedRegister.calledOnce).to.be.true;
      expect(spiedSign.called).to.be.false;
      expect(spiedCommitment.called).to.be.false;
      expect(spiedApprove.called).to.be.false;
    });

    /**
     * Target: testing handleMessage calling correct handle function
     * Dependencies:
     *  -
     *  Expected: handleSign called and other handlers don't call
     */
    it('should call handle sign handle function', () => {
      const handler = new MultiSigHandler(
        publicKeys,
        '168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f'
      );
      const message =
        '{"type":"sign","payload":{"txId":"356ebd85f01ee25c3c241950b77d533ee46bcdc7c3a02a2f24bb25946b9fec96","commitment":{"0":[{"a":"02acf3bf8466386df1cedca127ac8e025223ce1f88f430fc6f1dfabc424857e15c","position":"0-1"}]},"index":1,"id":"12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2"},"sign":"+nHOaX5etrB+JI3tMa+EfSsBX7tBKhALubQ7D3iLl4VuzsXFOFfkgpas8tPm5/nrElGW5Y4CpzB+DuWAEvK1sA=="}';
      const spiedCommitment = sinon.spy(handler, 'handleCommitment');
      const spiedSign = sinon.stub(handler, 'handleSign');
      spiedSign.returns();
      const spiedRegister = sinon.spy(handler, 'handleRegister');
      const spiedApprove = sinon.spy(handler, 'handleApprove');
      handler.handleMessage(
        message,
        'multi-sig',
        '12D3KooWSC69DeYqzwjeDYFFXqEgNPUvDxVaypezZpkUXVA8UkR2'
      );
      expect(spiedSign.calledOnce).to.be.true;
      expect(spiedApprove.called).to.be.false;
      expect(spiedCommitment.called).to.be.false;
      expect(spiedRegister.called).to.be.false;
    });
  });

  describe('getPeerId', () => {
    /**
     * Target: test that getPeerId returns valid dialer message
     * Dependencies:
     *  -
     *  Expected: getPeerId return 'peerId' as peerId
     */
    it("it should return peerId equal to 'peerId'", () => {
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      expect(handler.getPeerId()).to.be.eql('peerId');
    });
  });

  describe('handlePublicKeysChange', () => {
    const updatedPublicKeys = [
      '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb1',
      '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb2',
      '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb3',
      '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb4',
      '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb5',
      '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb6',
      '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb7',
    ];

    /**
     * Target:
     * It should update peers based on new public keys.
     *
     * Dependencies:
     * None
     *
     * Scenario:
     * Create an instance and call `handlePublicKeysChange` with new public keys
     *
     * Expected output:
     * The peers should be changed
     */
    it('should update peers based on new public keys', () => {
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );

      handler.handlePublicKeysChange(updatedPublicKeys);

      expect(handler.verifyIndex(6)).to.equal(true);
    });

    /**
     * Target:
     * It should call `sendRegister`
     *
     * Dependencies:
     * None
     *
     * Scenario:
     * Create an instance and call `handlePublicKeysChange` with new public keys
     *
     * Expected output:
     * The `sendRegister` method should get called
     */
    it('should call `sendRegister`', () => {
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );

      const sendRegisterSpy = sinon.spy(handler, 'sendRegister');
      handler.handlePublicKeysChange(updatedPublicKeys);

      expect(sendRegisterSpy.calledOnce).to.be.true;
    });
  });

  describe('handleRegister', () => {
    /**
     * Target: test that handleRegister called sendMessage
     * Dependencies:
     *  -
     *  Expected: sendMessage called once
     */
    it('should call handle register without no error', () => {
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      const spiedSendMessage = sinon.spy(handler, 'sendMessage');
      handler.handleRegister('sender', {
        index: 1,
        nonce: 'nonce',
        myId: 'myId',
      });
      expect(spiedSendMessage.calledOnce).to.be.true;
    });
  });

  describe('handleSign', () => {
    /**
     * Target: test that handleSign runs with no error when updateSign variable
     *  is false
     * Dependencies:
     *  -
     *  Expected: tests runs with no error
     */
    it('Transaction passed and no need to sign', async () => {
      const box1Hex =
        '80a8d6b907100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee72028cc10f00003a4f8dac9bbe80fffaf400edd5779b7ccd5628beceab06c41b5b7b3e091e963501';
      const dataBoxHex =
        '80ade2041006040004000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b2e4c6b2db6501fe7303000510730400720498b2720373050072048cc10f01a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a0421028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb82103074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364210300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee41021023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e100206081d827c338829135cc5c7d7f03ad9ba8ecffc6f5cddf63a2655c55922786230c000';
      const box1 = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(box1Hex, 'hex'))
      );
      const dataBox = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(dataBoxHex, 'hex'))
      );

      const obj = {
        transaction: {
          boxes: [box1],
          dataBoxes: [dataBox],
          commitments: [
            {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-0',
                },
              ],
            },
            {
              '0': [
                {
                  a: '03564c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-1',
                },
              ],
            },
          ],
          commitmentSigns: [''],
          createTime: 0,
          requiredSigner: 2,
          sign: {
            signed: [publicKeys[0]],
            simulated: [],
            transaction: Utils.base64StringToUint8Array(signedTrnasction),
          },
          secret: MultiSigUtils.convertToHintBag(
            {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-0',
                },
              ],
            },
            publicKeys[0]
          ),
        },
        release: () => null,
      };
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      sinon
        .stub(handler, 'getQueuedTransaction')
        .withArgs('txid')
        .returns(Promise.resolve(obj));
      const mockedHintsBag = MultiSigUtils.convertToHintBag(
        {
          '0': [
            {
              a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
              position: '0-1',
            },
          ],
        },
        publicKeys[1]
      );
      sinon
        .stub(MultiSigUtils, 'extract_hints')
        .returns(Promise.resolve(mockedHintsBag));
      sinon
        .stub(MultiSigUtils, 'generatedCommitmentToPublishCommitment')
        .returns({
          '0': [
            {
              a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
              position: '0-1',
            },
          ],
        });

      const generateSignStub = sinon
        .stub(handler, 'generateSign')
        .withArgs('txid', obj.transaction);
      handler.handleSign('sender', {
        commitments: [
          {
            index: 0,
            commitment: {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-0',
                },
              ],
            },
            sign: 'sign0',
          },
          {
            index: 1,
            commitment: {
              '0': [
                {
                  a: '03564c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-1',
                },
              ],
            },
            sign: 'sign1',
          },
        ],
        signed: [publicKeys[1]],
        simulated: ['2'],
        tx: '',
        txId: 'txid',
      });
      await delay(100);
      expect(generateSignStub.called).to.be.false;
    });

    /**
     * Target: test that handleSign in case of extracted commitment is not the same with
     *  commitment list
     * Dependencies:
     *  -
     *  Expected: handle sign should not call
     */
    it('Extracted commitment is not the same with commitment list should not call generateSign', async () => {
      const box1Hex =
        '80a8d6b907100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee72028cc10f00003a4f8dac9bbe80fffaf400edd5779b7ccd5628beceab06c41b5b7b3e091e963501';
      const dataBoxHex =
        '80ade2041006040004000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b2e4c6b2db6501fe7303000510730400720498b2720373050072048cc10f01a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a0421028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb82103074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364210300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee41021023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e100206081d827c338829135cc5c7d7f03ad9ba8ecffc6f5cddf63a2655c55922786230c000';
      const box1 = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(box1Hex, 'hex'))
      );
      const dataBox = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(dataBoxHex, 'hex'))
      );

      const obj = {
        transaction: {
          boxes: [box1],
          dataBoxes: [dataBox],
          commitments: [
            {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-0',
                },
              ],
            },
            {
              '0': [
                {
                  a: '03564c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-1',
                },
              ],
            },
          ],
          commitmentSigns: [''],
          createTime: 0,
          requiredSigner: 2,
          sign: {
            signed: [publicKeys[1]],
            simulated: [],
            transaction: Utils.base64StringToUint8Array(signedTrnasction),
          },
          secret: MultiSigUtils.convertToHintBag(
            {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-0',
                },
              ],
            },
            publicKeys[0]
          ),
        },
        release: () => null,
      };
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      sinon
        .stub(handler, 'getQueuedTransaction')
        .withArgs('txid')
        .returns(Promise.resolve(obj));

      const generateSignStub = sinon
        .stub(handler, 'generateSign')
        .withArgs('txid', obj.transaction);
      handler.handleSign('sender', {
        commitments: [
          {
            index: 0,
            commitment: {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-0',
                },
              ],
            },
            sign: 'sign0',
          },
          {
            index: 1,
            commitment: {
              '0': [
                {
                  a: '03564c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-1',
                },
              ],
            },
            sign: 'sign1',
          },
        ],
        signed: [publicKeys[1]],
        simulated: ['2'],
        tx: '',
        txId: 'txid',
      });
      await delay(100);
      expect(generateSignStub.called).to.be.false;
    });

    /**
     * Target: test that handleSign in case of Guards own commitment is not the same with
     *  commitment list
     * Dependencies:
     *  -
     *  Expected: handle sign should not call
     */
    it('My Commitment is not in the commitments list and should not call generateSign', async () => {
      const box1Hex =
        '80a8d6b907100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee72028cc10f00003a4f8dac9bbe80fffaf400edd5779b7ccd5628beceab06c41b5b7b3e091e963501';
      const dataBoxHex =
        '80ade2041006040004000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b2e4c6b2db6501fe7303000510730400720498b2720373050072048cc10f01a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a0421028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb82103074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364210300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee41021023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e100206081d827c338829135cc5c7d7f03ad9ba8ecffc6f5cddf63a2655c55922786230c000';
      const box1 = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(box1Hex, 'hex'))
      );
      const dataBox = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(dataBoxHex, 'hex'))
      );

      const obj = {
        transaction: {
          boxes: [box1],
          dataBoxes: [dataBox],
          commitments: [
            {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-0',
                },
              ],
            },
            {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-1',
                },
              ],
            },
          ],
          commitmentSigns: [''],
          createTime: 0,
          requiredSigner: 2,
          sign: {
            signed: [publicKeys[1]],
            simulated: [],
            transaction: Utils.base64StringToUint8Array(signedTrnasction),
          },
          secret: MultiSigUtils.convertToHintBag(
            {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-0',
                },
              ],
            },
            publicKeys[0]
          ),
        },
        release: () => null,
      };
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      sinon
        .stub(handler, 'getQueuedTransaction')
        .withArgs('txid')
        .returns(Promise.resolve(obj));
      const generateSignStub = sinon
        .stub(handler, 'generateSign')
        .withArgs('txid', obj.transaction);
      handler.handleSign('sender', {
        commitments: [
          {
            index: 1,
            commitment: {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-1',
                },
              ],
            },
            sign: 'sign1',
          },
        ],
        signed: [publicKeys[1]],
        simulated: ['2'],
        tx: '',
        txId: 'txid',
      });
      await delay(100);
      expect(generateSignStub.called).to.be.false;
    });

    /**
     * Target: test that handleSign in case of saved commitment is not the same with
     *  commitment list
     * Dependencies:
     *  -
     *  Expected: handle sign should not call
     */
    it('Saved commitments is not the same commitments list and should not call generateSign', async () => {
      const box1Hex =
        '80a8d6b907100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee72028cc10f00003a4f8dac9bbe80fffaf400edd5779b7ccd5628beceab06c41b5b7b3e091e963501';
      const dataBoxHex =
        '80ade2041006040004000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b2e4c6b2db6501fe7303000510730400720498b2720373050072048cc10f01a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a0421028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb82103074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364210300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee41021023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e100206081d827c338829135cc5c7d7f03ad9ba8ecffc6f5cddf63a2655c55922786230c000';
      const box1 = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(box1Hex, 'hex'))
      );
      const dataBox = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(dataBoxHex, 'hex'))
      );

      const obj = {
        transaction: {
          boxes: [box1],
          dataBoxes: [dataBox],
          commitments: [
            {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-0',
                },
              ],
            },
            {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-1',
                },
              ],
            },
          ],
          commitmentSigns: [''],
          createTime: 0,
          requiredSigner: 2,
          sign: {
            signed: [publicKeys[1]],
            simulated: [],
            transaction: Utils.base64StringToUint8Array(signedTrnasction),
          },
          secret: MultiSigUtils.convertToHintBag(
            {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-0',
                },
              ],
            },
            publicKeys[0]
          ),
        },
        release: () => null,
      };
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      sinon
        .stub(handler, 'getQueuedTransaction')
        .withArgs('txid')
        .returns(Promise.resolve(obj));
      const generateSignStub = sinon
        .stub(handler, 'generateSign')
        .withArgs('txid', obj.transaction);
      handler.handleSign('sender', {
        commitments: [
          {
            index: 0,
            commitment: {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-0',
                },
              ],
            },
            sign: 'sign0',
          },
          {
            index: 1,
            commitment: {
              '0': [
                {
                  a: '03564c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-1',
                },
              ],
            },
            sign: 'sign1',
          },
        ],
        signed: [publicKeys[1]],
        simulated: ['2'],
        tx: '',
        txId: 'txid',
      });
      await delay(100);
      expect(generateSignStub.called).to.be.false;
    });

    /**
     * Target: test that handleSign runs with no error when updateSign variable
     *  is true
     * Dependencies:
     *  -
     *  Expected: tests runs with no error
     */
    it('GenerateSign should call with no error', async () => {
      const box1Hex =
        '80a8d6b907100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee72028cc10f00003a4f8dac9bbe80fffaf400edd5779b7ccd5628beceab06c41b5b7b3e091e963501';
      const dataBoxHex =
        '80ade2041006040004000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b2e4c6b2db6501fe7303000510730400720498b2720373050072048cc10f01a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a0421028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb82103074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364210300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee41021023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e100206081d827c338829135cc5c7d7f03ad9ba8ecffc6f5cddf63a2655c55922786230c000';
      const box1 = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(box1Hex, 'hex'))
      );
      const dataBox = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(dataBoxHex, 'hex'))
      );

      const obj = {
        transaction: {
          boxes: [box1],
          dataBoxes: [dataBox],
          commitments: [
            {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-0',
                },
              ],
            },
            {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-1',
                },
              ],
            },
          ],
          commitmentSigns: [''],
          createTime: 0,
          requiredSigner: 2,
          sign: {
            signed: [publicKeys[1]],
            simulated: [],
            transaction: Utils.base64StringToUint8Array(signedTrnasction),
          },
          secret: MultiSigUtils.convertToHintBag(
            {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-0',
                },
              ],
            },
            publicKeys[0]
          ),
        },
        release: () => null,
      };
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      sinon
        .stub(handler, 'getQueuedTransaction')
        .withArgs('txid')
        .returns(Promise.resolve(obj));
      const generateSignStub = sinon
        .stub(handler, 'generateSign')
        .withArgs('txid', obj.transaction);
      handler.handleSign('sender', {
        commitments: [
          {
            index: 0,
            commitment: {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-0',
                },
              ],
            },
            sign: 'sign0',
          },
          {
            index: 1,
            commitment: {
              '0': [
                {
                  a: '03664c27e2b57cfb9253270da7ef5ef0f71d2285297ab2b3df6f990a3ca3e6a913',
                  position: '0-1',
                },
              ],
            },
            sign: 'sign1',
          },
        ],
        signed: [publicKeys[1]],
        simulated: ['2'],
        tx: '',
        txId: 'txid',
      });
      await delay(100);
      expect(generateSignStub.called).to.be.true;
    });
  });

  describe('handleCommitment', () => {
    /**
     * Target: test that handleCommitment runs with no error
     *
     * Dependencies:
     *  -
     *  Expected: test runs with no error
     */
    it('handleCommitment should call with no error', async () => {
      const box1Hex =
        '80a8d6b907100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee72028cc10f00003a4f8dac9bbe80fffaf400edd5779b7ccd5628beceab06c41b5b7b3e091e963501';
      const dataBoxHex =
        '80ade2041006040004000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b2e4c6b2db6501fe7303000510730400720498b2720373050072048cc10f01a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a0421028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb82103074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364210300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee41021023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e100206081d827c338829135cc5c7d7f03ad9ba8ecffc6f5cddf63a2655c55922786230c000';
      const box1 = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(box1Hex, 'hex'))
      );
      const dataBox = wasm.ErgoBox.sigma_parse_bytes(
        Uint8Array.from(Buffer.from(dataBoxHex, 'hex'))
      );
      const obj = {
        transaction: {
          boxes: [box1],
          dataBoxes: [dataBox],
          commitments: [undefined],
          commitmentSigns: [''],
          createTime: 0,
          requiredSigner: 2,
        },
        release: () => null,
      };
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      const getQueuedStub = sinon
        .stub(handler, 'getQueuedTransaction')
        .withArgs('txid')
        .resolves(obj);
      const generateSignStub = sinon
        .stub(handler, 'generateSign')
        .withArgs('txid', obj.transaction);
      handler.handleCommitment(
        'sender',
        {
          commitment: { index: [{ a: '3', position: '1-1' }] },
          txId: 'txid',
          index: 1,
        },
        'sign'
      );
      await delay(100);
      expect(getQueuedStub.called).to.be.true;
      expect(generateSignStub.called).to.be.true;
    });
  });

  describe('cleanup', () => {
    /**
     * add two instance of transaction to multi-sig handler using getTransaction
     * then clean called.
     * one of them must removed from txQueue. so create time must differ
     */
    it('should remove element from txQueue', async () => {
      const handler = new MultiSigHandler(
        publicKeys,
        '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046'
      );
      const tx1 = await handler.getQueuedTransaction('tx1');
      tx1.release();
      await delay(3000);
      const tx2 = await handler.getQueuedTransaction('tx2');
      tx2.release();
      handler.cleanup();
      const tx3 = await handler.getQueuedTransaction('tx2');
      tx3.release();
      const tx4 = await handler.getQueuedTransaction('tx1');
      tx3.release();
      expect(tx3.transaction).to.be.eql(tx2.transaction);
      expect(tx4.transaction).to.not.be.eql(tx1.transaction);
    }).timeout(5000);
  });
});
