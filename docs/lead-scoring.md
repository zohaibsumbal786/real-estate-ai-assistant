# Lead Scoring Weights

The automated lead score is capped at 100 points.

- Intent weight, max 35: sales = 35, booking = 30, support = 15, complaint = 10, other = 5.
- Captured data weight, max 35: phone = 10, email = 10, name = 8, company = 7.
- Engagement weight, max 20: 2 points per inbound message up to 12, 4 points for a detailed message over 80 characters, 4 points for an existing active conversation.
- Urgency weight, max 10: buying, quotation, urgent, today, tomorrow, visit, meeting, or similar high-intent terms.

Status mapping:

- 70+ = `QUALIFIED`
- 50-69 = `CONTACTED`
- Below 50 = `NEW`
