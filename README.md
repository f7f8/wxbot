# wxbot
> 微信智能服务助手。

## 特点
1. 接口最大程度采用 [REST](https://zh.wikipedia.org/wiki/REST) 风格，简单易用。
2. 接口交换数据统一使用 [json](https://zh.wikipedia.org/wiki/JSON) 格式。

## 支持的应用场景
### 微信群自动管理

![群主建群](https://www.websequencediagrams.com/cgi-bin/cdraw?lz=576k5Li7LT4r5ZGx5ZGx576k566h5a62OiDnlLPor7flu7rnvqQKAA8PLS0-LQA0BjogPDzliqnmiYvkuoznu7TnoIHlkoznvqTnvJblj7c-PgoAWQnnvqQAJAY6IOWKoOWlveWPiwoADAkARwzpqozor4HpgJrov4cAKxXmj5DkvpsAXQkAOwsAgTYTAEgGACMKAIE2FgCBEwjnvqTkv6Hmga_vvIhJRCwg5ZCN56ew77yM5o6o6ZO-77yJAGIMAIFIDACCJQXmi4kAgk0GAIFEFgAeB4iQ5Yqf77yBCg&s=earth)

![群员入群](https://www.websequencediagrams.com/cgi-bin/cdraw?lz=576k5ZGYLT4r576k5Yqp5omLOiDliqDlpb3lj4sKAAwJLS0-LQAlBjog6aqM6K-B6YCa6L-HAB0FADAQ5o-Q5L6b5Luk54mMADgLPivlkbHlkbHnvqTnrqHlrrYAQwjnvqQAJgcAEg8AbggAgREH576k5L-h5oGv5LiO5oiQ5ZGYSUQAVAwAdwyLieS6uuWFpee-pAAMF-eUqAA9COi_m-ihjOWkh-azqACBXhYARAbmiJDlip_vvIEK&s=earth)

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
        "qunid": "8888",
        "name": "水泊梁山",
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
| nickname      | string    | 群员昵称          | 是    | 黑旋风                                    |

返回结果：
>
```
// 入群成功
{
    "membership_join_response": {
        "qunid": "8888",
        "name": "水泊梁山",
        "memberid": "8888-001"
    }
}
```
