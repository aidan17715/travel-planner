export interface TutorialView {
  tab: 'Itinerary' | 'Flights' | 'Expenses'
  split?: boolean
  overview?: boolean
}

export interface TutorialStep {
  title: string
  body: string
  view: TutorialView
  // Element to scroll into view once the step's screen has appeared
  scrollTo?: string
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome 👋',
    body:
      "This example trip has everything filled in: flights, hotels, activities, expenses and a group split between three friends. Press Next to take a short tour. You can tap around freely, and delete the trip when you're done.",
    view: { tab: 'Itinerary' },
  },
  {
    title: 'Trips and days',
    body:
      'Every trip has a start and end date. Each day gets its own card below. Change the dates here and the days update, and flights on the old start or end date move with them.',
    view: { tab: 'Itinerary' },
    scrollTo: '.dates',
  },
  {
    title: "A day's schedule",
    body:
      "Day 2 has a few activities, each with a time, a map link, notes and a cost. Tap Edit to change one, ✕ to delete it, or + Add activity to add your own. Costs go into Expenses automatically.",
    view: { tab: 'Itinerary' },
    scrollTo: '.days > .day-card:nth-child(2)',
  },
  {
    title: 'Hotels',
    body:
      '“Hotel tonight” shows where you sleep that night. A hotel has a check-in day and a check-out day, optional times and a cost. On Day 3 you check out of the first hotel (see the 🚪 Check out entry in the schedule) and check into the second. Tap + Add hotel on any day without one.',
    view: { tab: 'Itinerary' },
    scrollTo: '.days > .day-card:nth-child(3)',
  },
  {
    title: 'Flights',
    body:
      'Each flight has its own page, listed in the side menu. Tap + Add flight for more. Fill in times, airports, terminal (just type the number, the T is added for you), flight number, booking reference and cost. Picking a departure date fills in the arrival date. Flights then appear in the right order in each day.',
    view: { tab: 'Flights' },
  },
  {
    title: 'Expenses',
    body:
      'Total spent is shown per currency. This trip uses SGD and JPY, and nothing is converted between them. Costs from hotels, flights and activities are included automatically, and you can add your own expenses in any currency. The ring chart further down shows where the money goes.',
    view: { tab: 'Expenses' },
  },
  {
    title: 'Split mode',
    body:
      "Tap Split mode to share costs with friends. Add the people on the trip, then split each cost: choose who paid and who to split with, equally or with custom amounts (see the souvenirs). You can add an expense right here too. Costs marked “Not split yet” still need splitting, or use “Split all equally between everyone”.",
    view: { tab: 'Expenses', split: true },
    scrollTo: 'form.panel',
  },
  {
    title: 'Balances and who owes who',
    body:
      'Balances show what each person paid, their share, and whether they get money back or owe. “Who owes who” lists the payments needed, with one line per currency. Press Settle up to record a payment. Bailey has already paid Alex SGD 130 here.',
    view: { tab: 'Expenses', split: true },
    scrollTo: '.balances',
  },
  {
    title: 'Simplify debts',
    body:
      'Turn on Simplify debts to cut down the number of payments. It reroutes debts through the group, so “A owes B, B owes C” becomes “A owes C”. The hint under the title shows how many payments you would save.',
    view: { tab: 'Expenses', split: true },
    scrollTo: '.switch',
  },
  {
    title: 'Overview',
    body:
      'The 🗺️ Overview button shows every day side by side with its hotel, flights and activities, handy for a quick look at the whole trip. Press Close (or Esc) to go back.',
    view: { tab: 'Itinerary', overview: true },
  },
  {
    title: 'Plan together',
    body:
      'Tap 👥 Share to plan with friends. Sign in with Google, turn on sharing and create an invite link. Anyone who opens the link and signs in can edit the trip, and changes sync across devices. Only people with a valid link can see it.',
    view: { tab: 'Itinerary' },
    scrollTo: '.trip-head',
  },
  {
    title: "You're all set 🎉",
    body:
      "Press Delete on this trip when you're done, then + New trip to start your own. You can reopen this guide any time from the Guide button on the main screen. Tip: install the app from your browser menu, and use Export to back up your trips.",
    view: { tab: 'Itinerary' },
    scrollTo: '.trip-head',
  },
]
