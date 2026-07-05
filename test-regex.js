const str1 = '["O(n)", "]"]';
console.log('str1:', str1.replace(/,\s*([}\]])/g, '$1'));

const str2 = '{"question": "Is it A, ] or B?"}';
console.log('str2:', str2.replace(/,\s*([}\]])/g, '$1'));

const str3 = '{"options": ["A", "B", ]}';
console.log('str3:', str3.replace(/,\s*([}\]])/g, '$1'));
