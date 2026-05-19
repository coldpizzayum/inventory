import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

export default function handler() {
  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          background: '#F5F4F0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'sans-serif',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                background: '#E8461A',
                borderRadius: '12px',
                padding: '10px 20px',
                color: '#fff',
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '24px',
                display: 'flex',
              },
              children: 'DICAS',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: '64px',
                fontWeight: '700',
                color: '#1A1A1A',
                marginBottom: '16px',
                display: 'flex',
              },
              children: 'Inventory OS',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: '28px',
                color: '#5F5E5A',
                marginBottom: '48px',
                display: 'flex',
              },
              children: '工廠庫存管理系統',
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', gap: '16px' },
              children: ['生產看板', '加工流程', '進出貨登記', '訂單追蹤'].map(label => ({
                type: 'div',
                props: {
                  key: label,
                  style: {
                    background: '#fff',
                    border: '1px solid #EBEBEB',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '18px',
                    color: '#1A1A1A',
                    display: 'flex',
                  },
                  children: label,
                },
              })),
            },
          },
        ],
      },
    },
    { width: 1200, height: 630 }
  )
}
