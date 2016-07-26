# wxbot
> 微信智能服务助手。

## 特点
1. 接口最大程度采用 [REST](https://zh.wikipedia.org/wiki/REST) 风格，简单易用。
2. 接口交换数据统一使用 [json](https://zh.wikipedia.org/wiki/JSON) 格式。

## 支持的应用场景
### 微信群自动管理

![群主建群](https://www.websequencediagrams.com/cgi-bin/cdraw?lz=576k5Li7LT4r5ZGx5ZGx576k566h5a62OiDnlLPor7flu7rnvqRbUENdCgATDy0-K-W-ruS_oeacuuWZqOS6ujog5ZCv5Yqo5paw5a6e5L6LCgASDy0tPi0AVxE8POeZu-W9leS6jOe7tOeggT4-AFkSAIENEQB1BgArCeaOiOadgwBDBgCBGBEtPi0AgWEGOiA8POaJi-acuuerrwCBVAbpk77mjqUAcAwAgXga6K6-572u576k5L-h5oGvWwBCCQCCChIAZQ6IkOWKn-WIm-W7uuaWsOe-pD4-Cg&s=earth)

![群员入群]()

### 微信智能客服

![null]()

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

### 获取待处理队列
> GET /wxbot/queue

路径参数：
>
（无）

请求参数：
>
（无）

返回结果：
>
```
// 任务队列
{
    "get_queue_response": [
        "31415926",
        "31415927",
        "31415928",
        "31415929"
    ]
}
```

### 上传微信登录二维码
> POST /wxbot/{***owner***}/qrcode

路径参数：
>
| 参数          | 类型      | 说明              | 必填  | 示例                                          |
| :------------ | :-------- | :---------------- | :---- | :-------------------------------------------- |
| owner         | string    | 群主ID            | 是    | 31415926                                      |

请求参数：
>
| 参数          | 类型      | 说明              | 必填  | 示例                                          |
| :------------ | :-------- | :---------------- | :---- | :-------------------------------------------- |
| code          | string    | 二维码            | 是    | https://login.weixin.qq.com/l/4d-0BmfrOg==    |

返回结果：
>
```
// 上传成功
{
    "qrcode_response": {
        "result": "ok"
    }
}
```

### 获取群信息
> GET /wxbot/{***owner***}/info

路径参数：
>
| 参数          | 类型      | 说明              | 必填  | 示例                                          |
| :------------ | :-------- | :---------------- | :---- | :-------------------------------------------- |
| owner         | string    | 群主ID            | 是    | 31415926                                      |

请求参数：
>
（无）

返回结果：
>
```
// 群基本信息
{
    "info_response": {
        "owner": "31415926",
        "name": "404枫人院",
        "expire": "2016-07-31"
    }
}
```

### 请求入群
> POST /wxbot/{***owner***}/member

路径参数：
>
| 参数          | 类型      | 说明              | 必填  | 示例                                          |
| :------------ | :-------- | :---------------- | :---- | :-------------------------------------------- |
| owner         | string    | 群主ID            | 是    | 31415926                                      |

请求参数：
>
| 参数          | 类型      | 说明              | 必填  | 示例                                      |
| :------------ | :-------- | :---------------- | :---- | :---------------------------------------- |
| token         | string    | 入群令牌          | 是    | NTkxNjkwNzE4RDY2                          |
| nickname      | string    | 群员昵称          | 是    | 黑旋风                                    |

返回结果：
>
```
// 入群成功
{
    "membership_join_response": {
        "owner": "31415926",
        "name": "404枫人院"
    }
}
```


### 获取群成员列表（包括群主）
> GET /wxbot/{***owner***}/member

路径参数：
>
| 参数          | 类型      | 说明              | 必填  | 示例                                          |
| :------------ | :-------- | :---------------- | :---- | :-------------------------------------------- |
| owner         | string    | 群主ID            | 是    | 31415926                                      |

请求参数：
>
（无）

返回结果：
>
```
// 成员信息列表
{
    "membership_list_response": [
        '宋公明', '黑旋风', '鲁智深', '武松'
    ]
}
```

### 群主申请提现
> POST /wxbot/{***owner***}/withdraw

路径参数：
>
| 参数          | 类型      | 说明              | 必填  | 示例                                          |
| :------------ | :-------- | :---------------- | :---- | :-------------------------------------------- |
| owner         | string    | 群主ID            | 是    | 31415926                                      |

请求参数：
>
（无）

返回结果：
>
```
// 提现成功
{
    "withdraw_response": {
        "new_members": 231,
        "total": 1129,
        "profit": 1029,
        "fee": 100
    }
}
```
