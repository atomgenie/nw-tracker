import type {GetStaticProps, NextPage} from "next"
import styled from "styled-components"
import axios from "axios"
import {useCallback, useEffect, useState} from "react"

interface HomeProps {}

const StyledContainer = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  background-color: #223843;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
`

const StyledTimer = styled.div`
  color: #d77a61;
  font-weight: 700;
  font-size: 80px;
`

const Home: NextPage<HomeProps> = props => {
  const [position, setPosition] = useState<number | undefined>()
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)

    axios
      .get<number>("/api/get_queue")
      .then(data => {
        const position = data.data
        setPosition(position)
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchData()

    const interval = setInterval(() => fetchData(), 30000)

    return () => {
      clearInterval(interval)
    }
  }, [fetchData])

  return (
    <StyledContainer>
      <StyledTimer>
        {loading && position === undefined ? "Loading..." : null}
        {position !== undefined ? position : null}
        {loading && position !== undefined ? "..." : null}
      </StyledTimer>
    </StyledContainer>
  )
}

export default Home
