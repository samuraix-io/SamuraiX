require('babel-register');
require('babel-polyfill');
const gwei = n => (n*10**9).toString(10);

module.exports = {
    networks: {
        main: {
            host: 'localhost',
            port: 8545,
            from: '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1',
            gasPrice: gwei(22),
            gas: '80000',
            network_id: 1
        },
        test: {
            host: 'localhost',
            port: 8545,
            from: '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1',
            gasPrice: gwei(2),
            gas: '80000',
            network_id: 4
        },
        development: {
            host: "localhost",
            port: 8545,
            gasPrice: gwei(3),
            gas: '6500000',
            network_id: "*" // Match any network id
        },
    },
    mocha: {
        useColors: true,
        slow: 30000,
        bail: true
    },
    solc: { optimizer: { enabled: true, runs: 200 } }
};
