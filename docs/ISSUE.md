# Проблема с созданием платежа через API Noros

При попытке создать платеж через API по документации, мы сталкиваемся с проблемой получения реквизитов для оплаты.

**Base URL:** `https://rest.noros.org/api/v1`
**API Key:** `a419ee99-7181-4b77-bc13-5931effa25ea`

## 1. Получение списка банков

Запрос на получение списка доступных банков.

**Запрос:**
```bash
curl -s -X GET 'https://rest.noros.org/api/v1/banks' \
-H 'Content-Type: application/json' \
-H 'api_key: a419ee99-7181-4b77-bc13-5931effa25ea'
```

**Результат:**
```json
[
  {
    "id": 8,
    "name": "СБП",
    "logo": "https://files.noros.org/img/logo/SBP_logo.svg",
    "sort": 3
  },
  {
    "id": 1,
    "name": "Перевод по номеру карты",
    "logo": "https://files.noros.org/img/logo/rfperevodponomerukarty.svg.svg",
    "sort": 1
  }
]
```

---

## 2. Создание транзакции

Попытка создать транзакцию с `bankId: 1`.

**Запрос:**
```bash
curl -s -X POST 'https://rest.noros.org/api/v1/transaction' \
-H 'Content-Type: application/json' \
-H 'api_key: a419ee99-7181-4b77-bc13-5931effa25ea' \
-d '{
  "amount": 1000,
  "bankId": 1,
  "currency": "RUB",
  "orderId": "curl-debug-006"
}'
```

**Результат:**
```json
{
  "amount": 1000,
  "id": 6561199,
  "uid": "",
  "orderId": "curl-debug-006",
  "currency": "RUB",
  "status": "created",
  "updatedAt": "2025-12-15T13:31:26.097Z",
  "createdAt": "2025-12-15T13:31:26.097Z",
  "closeAt": null
}
```
**Проблема:** Ответ не содержит полей `card`, `cardOwner`, `bankReceiver`, `manual`, как указано в документации.

---

## 3. Подтверждение (принятие условий)

Попытка подтвердить транзакцию (принять условия), как описано в документации (`PATCH /transaction/{transId}`).

**Запрос:**
```bash
curl -v -X PATCH 'https://rest.noros.org/api/v1/transaction/6561199' \
-H 'Content-Type: application/json' \
-H 'api_key: a419ee99-7181-4b77-bc13-5931effa25ea' \
-d '{}'
```

**Результат:** `403 Forbidden`
```json
{
  "message": "No free requisites for the selected bank. Please try again later."
}
```
**Проблема:** Этот шаг завершается ошибкой, которая указывает на отсутствие свободных реквизитов у провайдера для *любого* из доступных банков. Без успешного выполнения этого шага, реквизиты для оплаты так и не появляются.

## Вопрос к поддержке

Не могли бы вы пояснить, пожалуйста, правильный порядок действий для создания платежа и получения реквизитов? Почему `POST /transaction` не возвращает реквизиты сразу, и при каких условиях `PATCH /transaction/{transId}` будет выполнен успешно?

```