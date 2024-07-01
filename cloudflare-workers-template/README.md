# 通过模版创建Solana action

[![Deploy with Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Fankouzu/solana-action/tree/main/cloudflare-workers-template)

## 设置

运行以下命令通过这个模版创建Solana action

```sh
$ npm create cloudflare@latest -- --template https://github.com/Fankouzu/solana-action/cloudflare-workers-template
```

## 开发

修改src/index.ts的20行和23行定制收款地址：

```js
const DEFAULT_SOL_ADDRESS: PublicKey = new PublicKey(
  "Cuigpd5P2LWTw1KDLWRuyCnA5xFuwUPEZhhZzr54ZL33" // donate wallet
);
const DEFAULT_SOL_AMOUNT: number = 0.1; // amount
```

保存后运行本地测试:

```sh
npm run dev
```

同时可以打开Dialect测试Blink: https://dial.to/?action=solana-action:http://localhost:8787. 注意：仅在本地开发有效

## 部署

通过cloudflare workers部署：

```sh
npm run deploy
```

cloudflare workers的更多使用方法阅读: https://developers.cloudflare.com/workers/