/**
 * EN / FIL copy for Analytics metric info popovers (MetricInfoDialog).
 */
export const ANALYTICS_METRIC_HELP = {
    previousPeriod: {
        titleEn: 'Period Comparison',
        titleFil: 'Pagkumpara sa Nakaraan',
        contentEn:
            'This shows how your current performance compares to the exact same number of days immediately before your selected start date. For example, if you view the last 7 days, we compare it to the 7 days prior.',
        contentFil:
            'Ipinapakita nito ang kaibahan ng iyong benta ngayon kumpara sa parehong bilang ng araw bago ang napili mong petsa. Halimbawa: kung 7 days ang tinitingnan mo, ikukumpara ito sa 7 days bago ito magsimula.',
    },
    totalRevenue: {
        titleEn: 'Total Sales',
        titleFil: 'Kabuuang Kita',
        contentEn:
            'The sum of all payments from orders marked as "Completed" within this date range. This is based on when the order was finished, not when it was first placed. Cancelled orders are not included.',
        contentFil:
            'Ito ang kabuuan ng bayad mula sa mga order na "Completed" sa loob ng piniling petsa. Binabase ito sa oras kung kailan natapos ang order, hindi kung kailan ito inorder. Hindi kasama rito ang mga kinanselang order.',
    },
    orders: {
        titleEn: 'Total Orders Received',
        titleFil: 'Bilang ng Order',
        contentEn:
            'The total number of orders placed during this period, regardless of their current status. This helps you see the actual demand or how busy your shop was.',
        contentFil:
            'Bilang ng lahat ng order na pumasok sa piniling petsa (kahit ano pa ang status). Makakatulong ito para makita kung gaano karami ang nag-order sa inyo.',
    },
    completed: {
        titleEn: 'Successfully Completed Orders',
        titleFil: 'Mga Natapos na Order',
        contentEn:
            'These are the orders that were fully processed and finished. These orders are the main source of your sales data and shop analytics.',
        contentFil:
            'Ito ang mga order na matagumpay na nai-process at natapos. Dito binabase ang inyong kita at iba pang detalye ng benta.',
    },
    cancelled: {
        titleEn: 'Cancelled Orders',
        titleFil: 'Mga Kinanselang Order',
        contentEn:
            'The number of orders that were cancelled during this period. A high number may suggest issues with stock availability or customer communication.',
        contentFil:
            'Bilang ng mga order na hindi natuloy o kinansela. Kapag mataas ang bilang na ito, maaaring may problema sa stock, presyo, o pakikipag-usap sa customer.',
    },
    aov: {
        titleEn: 'Average Spend per Order',
        titleFil: 'Average na Gastos ng Customer',
        contentEn:
            'The average amount a customer spends on a single completed order. We calculate this by dividing your total revenue by the number of completed orders.',
        contentFil:
            'Ito ang karaniwang halaga na ginagastos ng isang customer sa bawat order. Kinukuha ito sa pamamagitan ng pag-divide ng kabuuang kita sa bilang ng mga natapos na order.',
    },
    bestDay: {
        titleEn: 'Your Top Selling Day',
        titleFil: 'Pinakamalakas na Araw',
        contentEn:
            'The specific day within your selected range that generated the highest sales from completed orders.',
        contentFil:
            'Ang araw sa loob ng iyong napiling petsa kung kailan ka nakakuha ng pinakamataas na kita mula sa mga natapos na order.',
    },
    revenueByDay: {
        titleEn: 'Daily Sales Breakdown',
        titleFil: 'Kita Bawat Araw',
        contentEn:
            'A daily view of your sales from completed orders. The chart shows a combined view of where the orders came from: Walk-ins, Deliveries, or Pickups.',
        contentFil:
            'Report ng kita araw-araw mula sa mga natapos na order. Makikita sa chart ang hati ng benta mula sa Walk-in, Delivery, at Pickup.',
    },
    ordersByChannel: {
        titleEn: 'Orders by Platform',
        titleFil: 'Order ayon sa Platform',
        contentEn:
            'This shows where your customers are ordering from (e.g., SMS, Messenger, Web, or Walk-in). It is based on the time the order was first created.',
        contentFil:
            'Dito makikita kung saan nanggagaling ang iyong mga order (halimbawa: SMS, Messenger, Web, o Walk-in). Binabase ito sa oras kung kailan ginawa ang order.',
    },
    ordersByFulfillment: {
        titleEn: 'How Customers Get Their Orders',
        titleFil: 'Paano Natatanggap ang Order',
        contentEn:
            'A comparison of how many customers chose Walk-in, Delivery, or Pickup. This helps you understand your customers\' preferences.',
        contentFil:
            'Paghahambing kung ilan ang nag-Walk-in, Delivery, o Pickup. Nakakatulong ito para malaman kung paano mas gustong makuha ng mga customer ang kanilang pagkain.',
    },
    paymentHealth: {
        titleEn: 'Payment Tracking',
        titleFil: 'Status ng Bayad',
        contentEn:
            'A check on your completed orders to see which ones are already paid and which are still marked as unpaid. Unpaid but completed orders may need a follow-up.',
        contentFil:
            'Sa mga natapos na order, makikita rito kung alin ang bayad na at alin ang hindi pa. Ang mga "completed" na pero "unpaid" ay maaaring kailangang i-follow up.',
    },
    itemLeaderboard: {
        titleEn: 'Most Popular Items',
        titleFil: 'Ranking ng mga Item',
        contentEn:
            'A ranking of your items based on how many units were sold. "Sell-through" shows if you sold more or less than the stock you initially set. If it\'s over 100%, it means you restocked or sold more than your recorded limit.',
        contentFil:
            'Listahan ng mga item mula sa pinakamabenta. Ang "sell-through" ay nagpapakita kung naubos ba ang iyong inilistang stock. Kapag lumampas sa 100%, ibig sabihin ay nag-restock ka o mas marami ang nabenta kaysa sa naitalang bilang.',
    },
    sellThrough: {
        titleEn: 'Stock Sold Percentage',
        titleFil: 'Porsyento ng Naubos na Stock',
        contentEn:
            'The percentage of your inventory sold. It compares the items sold against the daily stock targets you set. If you see "No stock data," it means no stock limit was entered for that item.',
        contentFil:
            'Ito ang porsyento ng iyong paninda na nabenta kumpara sa stock na itinakda mo. Kung "No stock data" ang nakalagay, ibig sabihin ay hindi ka nakapag-input ng stock limit para sa item na iyon.',
    },
    trend: {
        titleEn: 'Sales Growth Trend',
        titleFil: 'Trend ng Benta',
        contentEn:
            'Shows if your item sales went up or down compared to the previous period. If an item had zero sales before, this will show as "Null" or empty.',
        contentFil:
            'Ipinapakita kung tumaas o bumaba ang benta ng isang item kumpara sa nakaraang period. Lalabas na "Null" o walang halaga kung wala talagang benta ang item na iyon noong nakaraan.',
    },
    risingFalling: {
        titleEn: 'Trending vs. Slowing Items',
        titleFil: 'Paangat at Pababang Items',
        contentEn:
            'Compares current sales to the previous period. Rising means you sold more units now; Falling means you sold fewer. If the numbers are the same, they won\'t appear on either list.',
        contentFil:
            'Kinukumpara ang benta ngayon sa nakaraang period. Rising kung mas marami ang nabenta ngayon; Falling kung mas kaunti. Kung pareho lang ang bilang, hindi ito lilitaw sa listahan.',
    },
    coOccurrence: {
        titleEn: 'Popular Item Pairings',
        titleFil: 'Magandang Combinations',
        contentEn:
            'Shows which items are often bought together in a single order. This is great for creating meal deals, promos, or planning your prep work.',
        contentFil:
            'Pinapakita kung anong mga item ang madalas na magkasamang binibili sa isang order. Maganda itong basehan para sa mga promo, bundles, o paghahanda sa kusina.',
    },
    reportCard: {
        titleEn: 'Quick Shop Overview',
        titleFil: 'Buod ng Report',
        contentEn:
            'An automated summary of your shop’s performance. It highlights your busy days, top revenue sources, and important operational updates.',
        contentFil:
            'Isang maikling paliwanag tungkol sa takbo ng iyong negosyo sa piniling petsa. Pinapakita rito ang dami ng order, kita, at iba pang mahahalagang detalye.',
    },
    heatmap: {
        titleEn: 'Peak Ordering Hours',
        titleFil: 'Peak Hours ng Order',
        contentEn:
            'A visual guide showing which hours of the week are your busiest. Darker colors mean more orders, helping you decide when to have more staff or run ads.',
        contentFil:
            'Isang chart na nagpapakita kung anong oras sa loob ng isang linggo ka pinakamaraming order. Kapag mas madilim ang kulay, mas maraming order. Makakatulong ito sa pag-iskedyul ng staff o pag-promote.',
    },
    fulfillmentSpeed: {
        titleEn: 'Order Preparation Speed',
        titleFil: 'Bilis ng Paggawa ng Order',
        contentEn:
            'Shows the average time it takes to finish an order—from the moment it\'s received until it’s marked as completed. This helps track how fast your service is.',
        contentFil:
            'Pinapakita ang bilis ng pag-process ng order mula nang matanggap ito hanggang sa matapos. Makakatulong ito para makita kung gaano kabilis ang inyong serbisyo.',
    },
    completionRateByDay: {
        titleEn: 'Daily Success Rate',
        titleFil: 'Completion Rate Bawat Araw',
        contentEn:
            'The percentage of orders that were successfully completed out of all orders made that day. You can adjust the "Target" line on the left to see if you\'re hitting your goals.',
        contentFil:
            'Porsyento ng mga order na matagumpay na natapos kumpara sa lahat ng order na pumasok sa araw na iyon. Maaari mong i-adjust ang "Target" line sa kaliwa para makita kung naabot mo ang iyong goal.',
    },
};
