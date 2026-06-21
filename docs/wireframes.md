# UI Wireframes

## Public Marketing Site

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] Dubai AI Business Agent    Features Pricing Contact   │
│                                    [EN/AR] [Dark] Login Trial│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  AI WHATSAPP FOR UAE SMEs                                    │
│  Your AI business agent on WhatsApp                          │
│  — in Arabic and English                                     │
│                                                              │
│  [Start 14-day free trial]  [View pricing]                   │
│                                                              │
│  ┌─────────────────────┐                                     │
│  │ WhatsApp Preview    │                                     │
│  │ Customer: 2BR apt?  │                                     │
│  │ AI: Yes! 3 options..│                                     │
│  └─────────────────────┘                                     │
│                                                              │
│  [Real Estate] [Restaurants] [Clinics] [Salons] ...          │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ WhatsApp │ │ Arabic/  │ │ Lead Gen │  ... (6 features)    │
│  │ AI       │ │ English  │ │ & CRM    │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
└──────────────────────────────────────────────────────────────┘
```

## Pricing Page

```
┌──────────────────────────────────────────────────────────────┐
│           Simple, transparent pricing                        │
│              [Monthly] [Yearly - Save 17%]                   │
│                                                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────────┐ ┌───────────┐       │
│ │Free     │ │Starter  │ │Professional │ │Enterprise │       │
│ │Trial    │ │AED 299  │ │★ AED 699    │ │AED 1,499  │       │
│ │AED 0    │ │         │ │             │ │           │       │
│ │[Start]  │ │[Start]  │ │[Start]      │ │[Start]    │       │
│ └─────────┘ └─────────┘ └─────────────┘ └───────────┘       │
└──────────────────────────────────────────────────────────────┘
```

## Dashboard (Authenticated)

```
┌────────────┬─────────────────────────────────────────────────┐
│ SIDEBAR    │ Operator workspace          [EN] [🌙] [Logout]  │
│            ├─────────────────────────────────────────────────┤
│ Dashboard  │ Command Center                                  │
│ Leads      │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│ Converse   │ │Conv │ │Open │ │Human│ │Won  │ │Resp │       │
│ Appts      │ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │
│ Knowledge  │ ┌──────────────────────┐ ┌───────────────┐     │
│ Analytics  │ │ Activity Chart       │ │ Recent Msgs   │     │
│ Team       │ │ (30-day trend)       │ │               │     │
│ Billing    │ └──────────────────────┘ └───────────────┘     │
│ Settings   │                                                 │
│            │                                                 │
│ [Org info] │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```

## Conversations (Split View)

```
┌──────────────────────────────────────────────────────────────┐
│ Conversation Console                                         │
├──────────────────┬───────────────────────────────────────────┤
│ Conversation List│ Message Thread                            │
│ ┌──────────────┐ │ Customer: Do you have villas in Palm?    │
│ │ Ahmed +971.. │ │ AI: Yes! We have 2 villas available...   │
│ │ Needs human  │ │ Customer: Book viewing Saturday          │
│ ├──────────────┤ │ AI: Here are 3 slots: ...                  │
│ │ Sara +971..  │ ├───────────────────────────────────────────┤
│ └──────────────┘ │ [Toggle AI] [Reply box...........] [Send]  │
└──────────────────┴───────────────────────────────────────────┘
```

## Mobile (Responsive)

- Sidebar collapses to hamburger menu
- Metric cards stack 2-column on tablet, 1-column on phone
- Conversation list full-width; tap to open thread overlay
- RTL: sidebar moves to right, text alignment flips

## Design System

| Token | Value |
|-------|-------|
| Background | `#070a13` → `#111827` gradient |
| Primary | Blue `#3b82f6` with glow shadow |
| Accent | Purple `#a78bfa` |
| Panel | Glass morphism `bg-white/5` + blur |
| Font | Inter + Noto Sans Arabic |
| Radius | `rounded-md` (6px) |
