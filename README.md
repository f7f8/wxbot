# wxbot
> 微信智能服务助手。

## 特点
1. 接口最大程度采用 [REST](https://zh.wikipedia.org/wiki/REST) 风格，简单易用。
2. 接口交换数据统一使用 [json](https://zh.wikipedia.org/wiki/JSON) 格式。

## 支持的应用场景
### 微信群自动管理

![商户资料及支付设置](https://www.websequencediagrams.com/cgi-bin/cdraw?lz=566h55CG5ZGYLT4r5LqR5ZWG5Z-OOiDllYbmiLforr7nva4KAA8JLT4AFwyvvOWFpeaUr-S7mAAXEitIaVBPU-S6kTog5pu05pawAEsHtYTmlpkKABUILS0-LQBrCzw86L-U5ZuePj4ALh0AZw0AHywtPi0AgWcJOiA8POWujOaIkD4-&s=earth)

### 微信智能客服

![门店增加POS机](https://www.websequencediagrams.com/cgi-bin/cdraw?lz=566h55CG5ZGYLT4r5LqR5ZWG5Z-OOiDlop7liqBQT1PmnLoKAA8JLT4AGAvnoa7lrprpl6jlupcAFwwrSGlQT1PkupE6IOivt-axguiuvuWkh-aOiOadg-eggQoAGAgtLT4tAGgLPDzov5Tlm54-Pgpsb29wIOetieW-heWbnuiwgwogICAgAHAXABsMZW5kAFUKAIFEDVtjYWxsYmFja10AgQMM5oiQ5Yqf6YCa55-lAIFcCy0-LQCBOwoAgQ0LABUNAIIxCTogPDwAgiQMAE8GPj4&s=earth)

## 接口返回错误信息格式
>
```
{
    "error": {
        "code": 1001,
        "message": "缺少必须的参数或参数值无效！"
    }
}
```

## API鉴权
专网使用

## 上行接口

### 请求建群
> POST /wxbot/qun

路径参数：
>
（无）

请求参数：
>
| 参数          | 类型      | 说明              | 必填  | 示例                                      |
| :------------ | :-------- | :---------------- | :---- | :---------------------------------------- |
| code          | string    | 群号代码          | 是    | MEU3RDZEOEZCNkMzfDg4ODg=                  |
| owner         | string    | 群主昵称          | 是    | 宋公明                                    |
| assistant     | string    | 助手微信帐号      | 是    | weimi1001                                 |

返回结果：
>
```
// 建群成功
{
    "qun_create_response": {
        "url": "http://yunmof.com/weiqun/MTAwMTEx"
    }
}
```

### 请求入群
> POST /wxbot/qun/membership

路径参数：
>
（无）

请求参数：
>
| 参数          | 类型      | 说明              | 必填  | 示例                                      |
| :------------ | :-------- | :---------------- | :---- | :---------------------------------------- |
| token         | string    | 入群令牌          | 是    | NTkxNjkwNzE4RDY2                          |
| member        | string    | 群员昵称          | 是    | 黑旋风                                    |

返回结果：
>
```
// 入群成功
{
    "membership_join_response": {
        "approved": "ok"
    }
}
```
