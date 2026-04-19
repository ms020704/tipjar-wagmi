'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatEther, parseEther } from 'viem'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { contract } from '@/contract'

function shortAddress(address?: string) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function Home() {
  const [name, setName] = useState('msk')
  const [message, setMessage] = useState('first sepolia tip')
  const [amountEth, setAmountEth] = useState('0.001')
  const [tipIndexInput, setTipIndexInput] = useState('0')

  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()

  const {
    data: txHash,
    isPending: isWriting,
    writeContract,
    error: writeError,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    })

  const { data: owner, refetch: refetchOwner } = useReadContract({
    ...contract,
    functionName: 'owner',
  })

  const { data: balance, refetch: refetchBalance } = useReadContract({
    ...contract,
    functionName: 'getBalance',
  })

  const { data: tipsCount, refetch: refetchTipsCount } = useReadContract({
    ...contract,
    functionName: 'getTipsCount',
  })

  const { data: totalTipsReceived, refetch: refetchTotalTipsReceived } =
    useReadContract({
      ...contract,
      functionName: 'totalTipsReceived',
    })

  const { data: myTotalTips, refetch: refetchMyTotalTips } = useReadContract({
    ...contract,
    functionName: 'getMyTotalTips',
    account: address,
    query: {
      enabled: Boolean(address),
    },
  })

  const tipIndex = useMemo(() => {
    try {
      return BigInt(tipIndexInput === '' ? '0' : tipIndexInput)
    } catch {
      return 0n
    }
  }, [tipIndexInput])

  const canReadTip = useMemo(() => {
    const count = Number(tipsCount ?? 0n)
    const idx = Number(tipIndexInput)
    return Number.isInteger(idx) && idx >= 0 && idx < count
  }, [tipIndexInput, tipsCount])

  const { data: selectedTip, refetch: refetchSelectedTip } = useReadContract({
    ...contract,
    functionName: 'getTip',
    args: [tipIndex],
    query: {
      enabled: canReadTip,
    },
  })

  const isOwner =
    Boolean(address) &&
    Boolean(owner) &&
    address!.toLowerCase() === (owner as string).toLowerCase()

  useEffect(() => {
    if (!isConfirmed) return

    refetchOwner()
    refetchBalance()
    refetchTipsCount()
    refetchTotalTipsReceived()
    refetchMyTotalTips()
    if (canReadTip) {
      refetchSelectedTip()
    }
  }, [
    isConfirmed,
    canReadTip,
    refetchOwner,
    refetchBalance,
    refetchTipsCount,
    refetchTotalTipsReceived,
    refetchMyTotalTips,
    refetchSelectedTip,
  ])

  const handleTip = () => {
    try {
      if (!amountEth || Number(amountEth) <= 0) {
        alert('팁 금액을 0보다 크게 입력하세요.')
        return
      }

      writeContract({
        ...contract,
        functionName: 'tip',
        args: [name, message],
        value: parseEther(amountEth),
      })
    } catch {
      alert('금액 형식을 다시 확인하세요. 예: 0.001')
    }
  }

  const handleWithdraw = () => {
    writeContract({
      ...contract,
      functionName: 'withdrawTips',
    })
  }

  const tipDetail = selectedTip as
    | readonly [`0x${string}`, bigint, string, string, bigint]
    | undefined

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold">TipJar Plus</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Sepolia 테스트넷 기반 TipJar dApp
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!isConnected ? (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                disabled={isConnecting || connectors.length === 0}
                className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                {isConnecting ? '연결 중...' : '메타마스크 연결'}
              </button>
            ) : (
              <>
                <div className="rounded-xl border px-4 py-2 text-sm">
                  연결됨: {shortAddress(address)}
                </div>
                <button
                  onClick={() => disconnect()}
                  className="rounded-xl border px-4 py-2 text-sm"
                >
                  연결 해제
                </button>
              </>
            )}
          </div>

          {isConnected && chainId !== sepolia.id && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              현재 네트워크가 Sepolia가 아닙니다. 메타마스크에서 Sepolia로
              바꿔주세요.
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">컨트랙트 정보</h2>
            <div className="mt-3 space-y-2 text-sm">
              <p>
                <span className="font-medium">주소:</span>{' '}
                {shortAddress(contract.address)}
              </p>
              <p>
                <span className="font-medium">Owner:</span>{' '}
                {owner ? shortAddress(owner as string) : '-'}
              </p>
              <p>
                <span className="font-medium">현재 잔액:</span>{' '}
                {balance !== undefined ? `${formatEther(balance)} ETH` : '-'}
              </p>
              <p>
                <span className="font-medium">누적 총 팁:</span>{' '}
                {totalTipsReceived !== undefined
                  ? `${formatEther(totalTipsReceived)} ETH`
                  : '-'}
              </p>
              <p>
                <span className="font-medium">팁 개수:</span>{' '}
                {tipsCount !== undefined ? tipsCount.toString() : '-'}
              </p>
              <p>
                <span className="font-medium">내 총 팁:</span>{' '}
                {myTotalTips !== undefined
                  ? `${formatEther(myTotalTips)} ETH`
                  : isConnected
                    ? '불러오는 중...'
                    : '-'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">팁 보내기</h2>

            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">이름</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none"
                  placeholder="이름 입력"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">메시지</label>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none"
                  placeholder="메시지 입력"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  팁 금액 (ETH)
                </label>
                <input
                  value={amountEth}
                  onChange={(e) => setAmountEth(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none"
                  placeholder="0.001"
                />
              </div>

              <button
                onClick={handleTip}
                disabled={!isConnected || isWriting || isConfirming}
                className="w-full rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              >
                {isWriting || isConfirming ? '전송 중...' : '팁 보내기'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">팁 상세 조회</h2>

          <div className="mt-3 flex flex-col gap-3 md:flex-row">
            <input
              value={tipIndexInput}
              onChange={(e) => setTipIndexInput(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none md:max-w-xs"
              placeholder="조회할 인덱스 (예: 0)"
            />
          </div>

          <div className="mt-4 rounded-xl border bg-zinc-50 p-4 text-sm">
            {!canReadTip ? (
              <p className="text-zinc-500">
                조회 가능한 인덱스를 입력하세요. 현재 팁 개수:{' '}
                {tipsCount?.toString() ?? '0'}
              </p>
            ) : tipDetail ? (
              <div className="space-y-2">
                <p>
                  <span className="font-medium">tipper:</span>{' '}
                  {shortAddress(tipDetail[0])}
                </p>
                <p>
                  <span className="font-medium">amount:</span>{' '}
                  {formatEther(tipDetail[1])} ETH
                </p>
                <p>
                  <span className="font-medium">name:</span> {tipDetail[2]}
                </p>
                <p>
                  <span className="font-medium">message:</span> {tipDetail[3]}
                </p>
                <p>
                  <span className="font-medium">timestamp:</span>{' '}
                  {tipDetail[4].toString()}
                </p>
              </div>
            ) : (
              <p className="text-zinc-500">데이터를 불러오는 중...</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Owner 전용 출금</h2>
          <p className="mt-2 text-sm text-zinc-600">
            현재 연결된 주소가 owner일 때만 출금할 수 있어.
          </p>

          <div className="mt-4">
            <button
              onClick={handleWithdraw}
              disabled={!isConnected || !isOwner || isWriting || isConfirming}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {isWriting || isConfirming ? '출금 처리 중...' : '팁 출금하기'}
            </button>
          </div>

          {!isOwner && isConnected && (
            <p className="mt-3 text-sm text-amber-600">
              현재 연결된 주소는 owner가 아니어서 출금 버튼이 비활성화되어 있어.
            </p>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">트랜잭션 상태</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              <span className="font-medium">tx hash:</span>{' '}
              {txHash ? txHash : '-'}
            </p>
            <p>
              <span className="font-medium">상태:</span>{' '}
              {isConfirming
                ? '블록체인 확인 중'
                : isConfirmed
                  ? '완료'
                  : isWriting
                    ? '서명/전송 중'
                    : '대기 중'}
            </p>
            {writeError && (
              <p className="text-red-600">에러: {writeError.message}</p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}