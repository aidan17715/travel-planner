import { uid } from './storage.ts'
import type { Expense, Flight, ItineraryItem, Split, Stay, Trip } from './types.ts'

const pad = (n: number) => String(n).padStart(2, '0')

// A five-day Tokyo trip starting a month from now, so the example always looks upcoming
export function buildExampleTrip(): Trip {
  const start = new Date()
  start.setDate(start.getDate() + 30)
  const day = (n: number) => {
    const d = new Date(start)
    d.setDate(d.getDate() + n)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  const alex = uid()
  const bailey = uid()
  const casey = uid()
  const everyone = [alex, bailey, casey]

  const flight = (f: Partial<Flight> & Pick<Flight, 'label' | 'departDate'>): Flight => ({
    id: uid(),
    airline: '',
    flightNumber: '',
    bookingRef: '',
    departTime: '',
    departAirport: '',
    departTerminal: '',
    arriveDate: f.departDate,
    arriveTime: '',
    arriveAirport: '',
    arriveTerminal: '',
    notes: '',
    cost: 0,
    currency: 'SGD',
    ...f,
  })

  const stay = (s: Omit<Stay, 'id'>): Stay => ({ id: uid(), ...s })

  const act = (dayNo: number, time: string, title: string, location: string, notes = '', cost = 0): ItineraryItem => ({
    id: uid(),
    date: day(dayNo),
    time,
    title,
    location,
    notes,
    cost,
    currency: 'JPY',
  })

  const expense = (description: string, category: Expense['category'], amount: number, currency = 'JPY'): Expense => ({
    id: uid(),
    description,
    category,
    amount,
    currency,
  })

  const outbound = flight({
    label: 'Outbound',
    airline: 'Singapore Airlines',
    flightNumber: 'SQ 12',
    bookingRef: 'K7M2QP',
    departDate: day(0),
    departTime: '09:15',
    departAirport: 'SIN – Changi',
    departTerminal: '3',
    arriveTime: '17:30',
    arriveAirport: 'NRT – Narita',
    arriveTerminal: '1',
    notes: 'Seats 42A–C. Online check-in opens 48h before.',
    cost: 390,
  })
  const ret = flight({
    label: 'Return',
    airline: 'Singapore Airlines',
    flightNumber: 'SQ 11',
    bookingRef: 'K7M2QP',
    departDate: day(4),
    departTime: '11:20',
    departAirport: 'NRT – Narita',
    departTerminal: '1',
    arriveTime: '17:35',
    arriveAirport: 'SIN – Changi',
    arriveTerminal: '3',
    cost: 390,
  })

  const hotel1 = stay({
    name: 'Hotel Gracery Shinjuku',
    address: '1-19-1 Kabukicho, Shinjuku City, Tokyo',
    notes: 'Booking ref GR-48213. Ask for a Godzilla-view room!',
    startDate: day(0),
    endDate: day(2),
    checkInTime: '15:00',
    checkOutTime: '11:00',
    cost: 42000,
    currency: 'JPY',
  })
  const hotel2 = stay({
    name: 'Sakura Hotel Asakusa',
    address: '2-6-15 Kaminarimon, Taito City, Tokyo',
    notes: 'Breakfast included.',
    startDate: day(2),
    endDate: day(4),
    checkInTime: '14:00',
    checkOutTime: '08:00',
    cost: 36000,
    currency: 'JPY',
  })

  const ramen = act(0, '20:00', 'Ramen dinner at Ichiran', 'Ichiran Shinjuku', 'Order the extra noodles.', 1500)
  const sensoji = act(1, '09:30', 'Visit Senso-ji Temple', 'Asakusa', 'Go early to beat the crowds.')
  const sushi = act(1, '12:30', 'Sushi lunch at Tsukiji Outer Market', 'Tsukiji', '', 4000)
  const teamlab = act(1, '15:00', 'teamLab Planets digital art museum', 'Toyosu', 'Barefoot. Wear shorts!', 11400)
  const izakaya = act(1, '19:30', 'Izakaya dinner', 'Omoide Yokocho', '', 6000)
  const takao = act(2, '08:30', 'Hike Mount Takao', 'Takaosanguchi Station', 'Bring water. About 2 hours up.')
  const soba = act(2, '13:30', 'Soba lunch near the summit', '', '', 1800)
  const shibuya = act(2, '18:30', 'Shopping in Shibuya', 'Shibuya Crossing', 'Tax-free counters need your passport.')
  const kamakura = act(3, '10:00', 'Day trip by train to Kamakura', 'Kamakura', 'See the Great Buddha.')
  const skytree = act(3, '17:00', 'Sunset at Tokyo Skytree', 'Tokyo Skytree', '', 6300)
  const karaoke = act(3, '21:00', 'Karaoke night', 'Shinjuku', '', 4500)
  const coffee = act(4, '07:30', 'Coffee and breakfast', 'Asakusa', 'Last meal before the airport.', 1200)

  const suica = expense('Suica transit cards', 'Transport', 5000)
  const souvenirs = expense('Souvenirs and gifts', 'Shopping', 12000)
  const wifi = expense('Pocket Wi-Fi rental', 'Other', 30, 'SGD')
  const insurance = expense('Travel insurance', 'Other', 45, 'SGD')

  const equal = (paidBy: string, among: string[] = everyone): Split => ({ paidBy, mode: 'equal', among, amounts: {} })

  const splits: Record<string, Split> = {
    [`flight-${outbound.id}`]: equal(alex),
    [`flight-${ret.id}`]: equal(alex),
    [`stay-${hotel1.id}`]: equal(bailey),
    [`stay-${hotel2.id}`]: equal(casey),
    [`activity-${ramen.id}`]: equal(alex, [alex, bailey]),
    [`activity-${sushi.id}`]: equal(bailey),
    [`activity-${teamlab.id}`]: equal(casey),
    [`activity-${izakaya.id}`]: equal(alex),
    [`activity-${soba.id}`]: equal(bailey, [alex, bailey]),
    [`activity-${skytree.id}`]: equal(casey),
    [`activity-${karaoke.id}`]: equal(alex),
    [suica.id]: equal(alex),
    // A custom split: each person owes a different amount
    [souvenirs.id]: { paidBy: bailey, mode: 'custom', among: [], amounts: { [alex]: 4000, [bailey]: 5000, [casey]: 3000 } },
    // The coffee, Wi-Fi and insurance are left unsplit on purpose, to show the "Not split yet" prompt
  }

  return {
    id: uid(),
    name: 'Example: Tokyo adventure',
    destination: 'Tokyo, Japan',
    startDate: day(0),
    endDate: day(4),
    currency: 'SGD',
    itinerary: [ramen, sensoji, sushi, teamlab, izakaya, takao, soba, shibuya, kamakura, skytree, karaoke, coffee],
    stays: [hotel1, hotel2],
    flights: [outbound, ret],
    expenses: [suica, souvenirs, wifi, insurance],
    members: [
      { id: alex, name: 'Alex' },
      { id: bailey, name: 'Bailey' },
      { id: casey, name: 'Casey' },
    ],
    splits,
    settlements: [{ id: uid(), from: bailey, to: alex, amount: 130, currency: 'SGD' }],
    simplify: false,
    example: true,
  }
}
