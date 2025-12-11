# Noros API Documentation

## Общая информация

API Noros предназначен для:
- приема пополнений (эквайринг);
- проверки статуса транзакций;
- управления выплатами;
- получения баланса и справочной информации.

Все запросы и ответы используют формат **JSON**, кроме загрузки файлов (multipart/form-data).

---

## Авторизация

API использует два типа ключей:

- `api_key` — для операций с пополнениями и справочной информации
- `api_secret_key` — для операций с балансом и выплатами

При отсутствии или неверном ключе сервер возвращает:
- `401 Unauthorized`
- либо `403 Forbidden`

> Формат передачи ключа (заголовок) задаётся на стороне Noros  
> *(например: `Authorization`, `x-api-key` и т.п.)*

---

## INFO

### Получить список банков для пополнения

Возвращает массив объектов **Банк**.

**Authorization:** `api_key`

**Endpoint:**
```http
GET /banks

Responses

Code	Description
200	Список банков
401	Ошибка доступа

Response (200)

[
  {
    "id": 1,
    "name": "Сбербанк",
    "logo": "https://files.noros.org/img/logo/bank1.png"
  }
]


⸻

Получить текущий баланс

Возвращает текущий баланс аккаунта.

Authorization: api_secret_key

Endpoint:

GET /balance

Responses

Code	Description
200	Баланс
401	Ошибка доступа

Response (200)

{
  "balance": 575,
  "frozenInPayouts": 100,
  "frozenInWithdrawals": 100
}


⸻

TRANSACTION

Работа с пополнениями

⸻

Создать новое пополнение (через Telegram-бота)

Создает пополнение и возвращает ссылку на Telegram-бота.

Authorization: api_key

Endpoint:

POST /telegram

Request Body

{
  "amount": 575,
  "orderId": "500001",
  "fio": "И. Иван Иванович",
  "card": "4276****2202",
  "clientId": "100001",
  "successUrl": "https://noros.org/success",
  "failUrl": "https://noros.org/fail"
}

Field	Type	Required	Description
amount	number	✅	Сумма пополнения
orderId	string	❌	ID заказа в вашей системе
fio	string	❌	ФИО клиента
card	string	❌	Номер карты отправителя
clientId	string	❌	ID клиента
successUrl	string	❌	URL успешного пополнения
failUrl	string	❌	URL ошибки

Response (200)

{
  "id": 1,
  "link": "https://ez-pay.mobi/payment/44dc87a4-0678-40ca-9810-54a79cd10ce3"
}


⸻

Создать пополнение (платежная страница)

Создает пополнение через стандартную платежную страницу.

Authorization: api_key

Endpoint:

POST /widget

➡️ Тело запроса и ответ идентичны /telegram

⸻

Создать новое пополнение (ручной выбор банка)

Authorization: api_key

Endpoint:

POST /transaction

Request Body

{
  "amount": 575,
  "bankId": 1,
  "orderId": "500001",
  "ip": "123.123.123.123",
  "fio": "И. Иван Иванович",
  "card": "4276****2202",
  "clientId": "100001",
  "uid": "300500"
}

Field	Type	Required
amount	number	✅
bankId	integer	✅
orderId	string	❌
ip	string	❌
fio	string	❌
card	string	❌
clientId	string	❌
uid	string	❌ (Deprecated)

Response (200)

{
  "id": 1,
  "amount": 100,
  "currency": "AED",
  "status": "created",
  "card": "4444 5555 6666 7777",
  "cardOwner": "Ivanov Ivan Ivanovich",
  "bankReceiver": "sberbank",
  "country": "ru",
  "manual": "Перейдите в \"Платежи / Переводы\"...",
  "amountOffer": 6700,
  "createdAt": "2022-11-01T12:42:57.242Z",
  "updatedAt": "2022-11-01T12:47:37.820Z",
  "uid": "300500",
  "orderId": "500001"
}


⸻

Получить состояние пополнения

Authorization: api_key

GET /transaction/{transId}


⸻

Принять условия пополнения

PATCH /transaction/{transId}


⸻

Изменить сумму или банк в пополнении

PUT /transaction/{transId}

Request

{
  "amount": 100,
  "bankId": 1
}


⸻

Отменить пополнение

DELETE /transaction/{transId}


⸻

Подтверждение выполненного перевода

Загрузка подтверждающего документа.

PATCH /transaction/{transId}/proof

Content-Type: multipart/form-data

Field	Type	Required
doc	file	❌


⸻

PAYOUT

Работа с выплатами

⸻

Создать выплату

Authorization: api_secret_key

POST /payout

Request

{
  "amount": 100,
  "number": "1111 2222 3333 4444",
  "bankname": "Сбербанк",
  "owner": "Иванов Иван Иванович",
  "uid": "300500"
}


⸻

Создать список выплат

Authorization: api_secret_key

POST /payouts

Request

{
  "payouts": [
    {
      "amount": 100,
      "number": "1111 2222 3333 4444",
      "bankname": "Сбербанк",
      "owner": "Иванов Иван Иванович",
      "uid": "300500"
    }
  ]
}


⸻

Получить состояние выплаты

GET /payout/{payoutId}


⸻

Отменить выплату

DELETE /payout/{payoutId}


⸻

Ответ объекта выплаты (пример)

{
  "id": 1,
  "amount": 100,
  "number": "1111 2222 3333 4444",
  "bankname": "Сбербанк",
  "owner": "Иванов Иван Иванович",
  "status": "Pending",
  "proof": "https://files.noros.org/proof/payout/...",
  "comment": "",
  "createdAt": "2022-11-01T12:42:57.242Z",
  "updatedAt": "2022-11-01T12:47:37.820Z",
  "closeDate": "2022-11-01T12:47:37.820Z",
  "uid": "300500"
}


⸻

Статусы и ошибки

Code	Description
200	Успешный запрос
401	Нет или неверный ключ
403	Доступ запрещен / ошибка операции


⸻

Примечания
	•	Поле uid помечено как Deprecated для пополнений
	•	Все даты — в формате ISO 8601
	•	Рекомендуется передавать orderId / uid для сопоставления с вашей системой

