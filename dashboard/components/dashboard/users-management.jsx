"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import * as LucideIcons from "lucide-react"
import { useDashboard } from "@/app/AllContext/DashboardContext"
import UserActionsModal from "./user-actions-modal"
import UserTasksModal from "./user-tasks-modal"
import TransactionsListModal from "./transactions-list-modal"
import RandomRewardModal from "./random-reward-modal"
import { useToast } from "@/hooks/use-toast"
import { useUsersContext } from "../../app/AllContext/UsersContext"

export default function UsersManagement() {
  const { users, fetchUsers, searchUsers, deleteUser, isLoadingUsers, totalUserPages } = useDashboard()
  const { transactions, fetchTasksByUser } = useUsersContext()
  const { toast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const [showActionsModal, setShowActionsModal] = useState(false)
  const [selectedUserForActions, setSelectedUserForActions] = useState(null)

  const [showTasksModal, setShowTasksModal] = useState(false)
  const [selectedUserForTasks, setSelectedUserForTasks] = useState(null)

  const [showTransactionsModal, setShowTransactionsModal] = useState(false)

  const [showRewardModal, setShowRewardModal] = useState(false)
  const [selectedUserForReward, setSelectedUserForReward] = useState(null)

  const [userTaskCounts, setUserTaskCounts] = useState({})
  const [refreshingTasks, setRefreshingTasks] = useState({})

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm.trim() === "") {
        // fetchUsers(currentPage)
      } else {
        searchUsers(searchTerm, currentPage)
      }
    }, 500)

    return () => clearTimeout(delayDebounce)
  }, [searchTerm, currentPage])

  const handleRefreshTasks = async (userId) => {
    setRefreshingTasks((prev) => ({ ...prev, [userId]: true }))

    try {
      const tasks = await fetchTasksByUser(userId)

      setUserTaskCounts((prev) => ({
        ...prev,
        [userId]: tasks.length,
      }))

      toast({
        title: "Tasks Updated",
        description: `Found ${tasks.length} tasks for this user`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      })
    } finally {
      setRefreshingTasks((prev) => ({ ...prev, [userId]: false }))
    }
  }

  const getTaskCount = (user) => {
    return userTaskCounts[user._id] !== undefined ? userTaskCounts[user._id] : user.NumOfTasks || 0
  }

  const handleEditUser = (user) => {
    setSelectedUser(user)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setSelectedUser(null)
    setShowForm(false)
  }

  const handleOpenActions = (user) => {
    setSelectedUserForActions(user)
    setShowActionsModal(true)
  }

  const handleCloseActionsModal = () => {
    setSelectedUserForActions(null)
    setShowActionsModal(false)
  }

  const handleViewTasks = (user) => {
    setSelectedUserForTasks(user)
    setShowTasksModal(true)
  }

  const handleCloseTasksModal = () => {
    setSelectedUserForTasks(null)
    setShowTasksModal(false)
  }

  const handleOpenTransactions = () => {
    setShowTransactionsModal(true)
  }

  const handleCloseTransactionsModal = () => {
    setShowTransactionsModal(false)
  }

  const handleOpenReward = (user) => {
    setSelectedUserForReward(user)
    setShowRewardModal(true)
  }

  const handleCloseRewardModal = () => {
    setSelectedUserForReward(null)
    setShowRewardModal(false)
  }

  const handlePageChange = (page) => {
    if (page < 1 || page > totalUserPages) return
    setCurrentPage(page)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Users Management
          </h2>
          <p className="text-slate-400 mt-2">Manage and control all user accounts</p>
        </div>

        <Button
          onClick={handleOpenTransactions}
          className="relative bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl px-6 py-6 shadow-lg transition-all"
        >
          <LucideIcons.Receipt className="h-5 w-5 mr-2" />
          <span className="font-semibold">Transactions</span>
          {transactions && transactions.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center animate-pulse border-2 border-slate-900">
              {transactions.length}
            </span>
          )}
        </Button>
      </div>

      <Card className="p-4 bg-slate-800/40 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-700/50">
        <div className="relative">
          <LucideIcons.Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
          <Input
            placeholder="Search by username or phone..."
            value={searchTerm}
            onChange={(e) => {
              setCurrentPage(1)
              setSearchTerm(e.target.value)
            }}
            className="pl-12 h-12 bg-slate-900/60 border-2 border-slate-700 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-slate-100 placeholder:text-slate-500"
          />
        </div>
      </Card>

      <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-lg overflow-hidden">
        {isLoadingUsers ? (
          <div className="p-12 text-center">
            <LucideIcons.Loader className="h-10 w-10 animate-spin text-slate-400 mx-auto" />
            <p className="text-slate-400 mt-4 font-semibold">Loading users...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-800/60 border-b border-slate-700">
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-200">Username</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-200">Referal Name</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-200">Phone</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-200">VIP Level</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-200">Tasks</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-200">Wallet Balance</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-200">Total Balance</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-200">Salary</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-slate-200">Commission</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-slate-200">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr
                        key={user._id}
                        className="border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-200">{user.username}</td>
                        <td className="px-6 py-4 font-semibold text-slate-200">{user.ReferralName}</td>
                        <td className="px-6 py-4 text-slate-400">{user.phone}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-purple-900/40 text-purple-300 rounded-full text-sm font-semibold border border-purple-700/50">
                            {user.currentVIPLevel?.name
                              ? `VIP${user.currentVIPLevel.number} ${user.currentVIPLevel.name}`
                              : "Not Set"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-green-400">{getTaskCount(user)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRefreshTasks(user._id)}
                              disabled={refreshingTasks[user._id]}
                              className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-md"
                              title="Refresh tasks count"
                            >
                              {refreshingTasks[user._id] ? (
                                <LucideIcons.Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <LucideIcons.RefreshCw className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-green-400">${user.walletBalance}</td>
                        <td className="px-6 py-4 font-semibold text-blue-400">{user.totalBalance}</td>
                        <td className="px-6 py-4 font-semibold text-blue-400">{user.salary}</td>
                        <td className="px-6 py-4 font-semibold text-blue-400">${user.commissionTotal}</td>

                        <td className="px-6 py-4 text-center flex justify-center gap-2">
                          <Button
                            onClick={() => handleOpenReward(user)}
                            variant="ghost"
                            size="icon"
                            className="text-yellow-400 hover:bg-yellow-900/20 hover:text-yellow-300 rounded-lg"
                            title="Random Reward"
                          >
                            <LucideIcons.Gift className="h-4 w-4" />
                          </Button>

                          <Button
                            onClick={() => handleViewTasks(user)}
                            variant="ghost"
                            size="icon"
                            className="text-yellow-400 hover:bg-yellow-900/20 hover:text-yellow-300 rounded-lg"
                            title={`View Tasks (${user.activeSetTasks?.length || 0})`}
                          >
                            <LucideIcons.CheckCircle className="h-4 w-4" />
                          </Button>

                          <Button
                            onClick={() => handleOpenActions(user)}
                            variant="ghost"
                            size="icon"
                            className="text-purple-400 hover:bg-purple-900/20 hover:text-purple-300 rounded-lg"
                            title="User Actions"
                          >
                            <LucideIcons.Settings className="h-4 w-4" />
                          </Button>

                          <Button
                            onClick={() => deleteUser(user._id)}
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg"
                          >
                            <LucideIcons.Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-10 text-slate-400 font-semibold">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center py-4 gap-3">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="rounded-xl bg-slate-900/40 text-slate-300 border-slate-700"
              >
                Previous
              </Button>

              <span className="text-slate-300 font-semibold py-2">
                Page {currentPage} of {totalUserPages}
              </span>

              <Button
                variant="outline"
                disabled={currentPage === totalUserPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="rounded-xl bg-slate-900/40 text-slate-300 border-slate-700"
              >
                Next
              </Button>
            </div>
          </>
        )}
      </div>

      {showActionsModal && <UserActionsModal user={selectedUserForActions} onClose={handleCloseActionsModal} />}
      {showTasksModal && (
        <UserTasksModal
          userId={selectedUserForTasks._id}
          userDetails={selectedUserForTasks}
          onClose={handleCloseTasksModal}
        />
      )}
      {showTransactionsModal && <TransactionsListModal onClose={handleCloseTransactionsModal} />}
      {showRewardModal && <RandomRewardModal user={selectedUserForReward} onClose={handleCloseRewardModal} />}
    </div>
  )
}
