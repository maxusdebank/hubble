// SPDX-License-Identifier: MIT
// This contract began as a fork of xSHADOW.
// It does not make use of the Voter Module, Rebasing etc.
// It uses xSHADOW lock and vest mechanics.
// It uses the transfer exemptions.
pragma solidity ^0.8.0;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

contract ERC20 is Context, IERC20, IERC20Metadata {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;
    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }

        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(_msgSender(), spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(sender, recipient, amount);

        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
            _balances[sender] = senderBalance - amount;
        }
        _balances[recipient] += amount;

        emit Transfer(sender, recipient, amount);

        _afterTokenTransfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);

        _afterTokenTransfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
        }
        _totalSupply -= amount;

        emit Transfer(account, address(0), amount);

        _afterTokenTransfer(account, address(0), amount);
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}
}


// OpenZeppelin Contracts (last updated v5.1.0) (utils/structs/EnumerableSet.sol)
// This file was procedurally generated from scripts/generate/templates/EnumerableSet.js.

pragma solidity ^0.8.20;

/**
 * @dev Library for managing
 * https://en.wikipedia.org/wiki/Set_(abstract_data_type)[sets] of primitive
 * types.
 *
 * Sets have the following properties:
 *
 * - Elements are added, removed, and checked for existence in constant time
 * (O(1)).
 * - Elements are enumerated in O(n). No guarantees are made on the ordering.
 *
 * ```solidity
 * contract Example {
 *     // Add the library methods
 *     using EnumerableSet for EnumerableSet.AddressSet;
 *
 *     // Declare a set state variable
 *     EnumerableSet.AddressSet private mySet;
 * }
 * ```
 *
 * As of v3.3.0, sets of type `bytes32` (`Bytes32Set`), `address` (`AddressSet`)
 * and `uint256` (`UintSet`) are supported.
 *
 * [WARNING]
 * ====
 * Trying to delete such a structure from storage will likely result in data corruption, rendering the structure
 * unusable.
 * See https://github.com/ethereum/solidity/pull/11843[ethereum/solidity#11843] for more info.
 *
 * In order to clean an EnumerableSet, you can either remove all elements one by one or create a fresh instance using an
 * array of EnumerableSet.
 * ====
 */
library EnumerableSet {
    // To implement this library for multiple types with as little code
    // repetition as possible, we write it in terms of a generic Set type with
    // bytes32 values.
    // The Set implementation uses private functions, and user-facing
    // implementations (such as AddressSet) are just wrappers around the
    // underlying Set.
    // This means that we can only create new EnumerableSets for types that fit
    // in bytes32.

    struct Set {
        // Storage of set values
        bytes32[] _values;
        // Position is the index of the value in the `values` array plus 1.
        // Position 0 is used to mean a value is not in the set.
        mapping(bytes32 value => uint256) _positions;
    }

    /**
     * @dev Add a value to a set. O(1).
     *
     * Returns true if the value was added to the set, that is if it was not
     * already present.
     */
    function _add(Set storage set, bytes32 value) private returns (bool) {
        if (!_contains(set, value)) {
            set._values.push(value);
            // The value is stored at length-1, but we add 1 to all indexes
            // and use 0 as a sentinel value
            set._positions[value] = set._values.length;
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Removes a value from a set. O(1).
     *
     * Returns true if the value was removed from the set, that is if it was
     * present.
     */
    function _remove(Set storage set, bytes32 value) private returns (bool) {
        // We cache the value's position to prevent multiple reads from the same storage slot
        uint256 position = set._positions[value];

        if (position != 0) {
            // Equivalent to contains(set, value)
            // To delete an element from the _values array in O(1), we swap the element to delete with the last one in
            // the array, and then remove the last element (sometimes called as 'swap and pop').
            // This modifies the order of the array, as noted in {at}.

            uint256 valueIndex = position - 1;
            uint256 lastIndex = set._values.length - 1;

            if (valueIndex != lastIndex) {
                bytes32 lastValue = set._values[lastIndex];

                // Move the lastValue to the index where the value to delete is
                set._values[valueIndex] = lastValue;
                // Update the tracked position of the lastValue (that was just moved)
                set._positions[lastValue] = position;
            }

            // Delete the slot where the moved value was stored
            set._values.pop();

            // Delete the tracked position for the deleted slot
            delete set._positions[value];

            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Returns true if the value is in the set. O(1).
     */
    function _contains(Set storage set, bytes32 value) private view returns (bool) {
        return set._positions[value] != 0;
    }

    /**
     * @dev Returns the number of values on the set. O(1).
     */
    function _length(Set storage set) private view returns (uint256) {
        return set._values.length;
    }

    /**
     * @dev Returns the value stored at position `index` in the set. O(1).
     *
     * Note that there are no guarantees on the ordering of values inside the
     * array, and it may change when more values are added or removed.
     *
     * Requirements:
     *
     * - `index` must be strictly less than {length}.
     */
    function _at(Set storage set, uint256 index) private view returns (bytes32) {
        return set._values[index];
    }

    /**
     * @dev Return the entire set in an array
     *
     * WARNING: This operation will copy the entire storage to memory, which can be quite expensive. This is designed
     * to mostly be used by view accessors that are queried without any gas fees. Developers should keep in mind that
     * this function has an unbounded cost, and using it as part of a state-changing function may render the function
     * uncallable if the set grows to a point where copying to memory consumes too much gas to fit in a block.
     */
    function _values(Set storage set) private view returns (bytes32[] memory) {
        return set._values;
    }

    // Bytes32Set

    struct Bytes32Set {
        Set _inner;
    }

    /**
     * @dev Add a value to a set. O(1).
     *
     * Returns true if the value was added to the set, that is if it was not
     * already present.
     */
    function add(Bytes32Set storage set, bytes32 value) internal returns (bool) {
        return _add(set._inner, value);
    }

    /**
     * @dev Removes a value from a set. O(1).
     *
     * Returns true if the value was removed from the set, that is if it was
     * present.
     */
    function remove(Bytes32Set storage set, bytes32 value) internal returns (bool) {
        return _remove(set._inner, value);
    }

    /**
     * @dev Returns true if the value is in the set. O(1).
     */
    function contains(Bytes32Set storage set, bytes32 value) internal view returns (bool) {
        return _contains(set._inner, value);
    }

    /**
     * @dev Returns the number of values in the set. O(1).
     */
    function length(Bytes32Set storage set) internal view returns (uint256) {
        return _length(set._inner);
    }

    /**
     * @dev Returns the value stored at position `index` in the set. O(1).
     *
     * Note that there are no guarantees on the ordering of values inside the
     * array, and it may change when more values are added or removed.
     *
     * Requirements:
     *
     * - `index` must be strictly less than {length}.
     */
    function at(Bytes32Set storage set, uint256 index) internal view returns (bytes32) {
        return _at(set._inner, index);
    }

    /**
     * @dev Return the entire set in an array
     *
     * WARNING: This operation will copy the entire storage to memory, which can be quite expensive. This is designed
     * to mostly be used by view accessors that are queried without any gas fees. Developers should keep in mind that
     * this function has an unbounded cost, and using it as part of a state-changing function may render the function
     * uncallable if the set grows to a point where copying to memory consumes too much gas to fit in a block.
     */
    function values(Bytes32Set storage set) internal view returns (bytes32[] memory) {
        bytes32[] memory store = _values(set._inner);
        bytes32[] memory result;

        assembly ("memory-safe") {
            result := store
        }

        return result;
    }

    // AddressSet

    struct AddressSet {
        Set _inner;
    }

    /**
     * @dev Add a value to a set. O(1).
     *
     * Returns true if the value was added to the set, that is if it was not
     * already present.
     */
    function add(AddressSet storage set, address value) internal returns (bool) {
        return _add(set._inner, bytes32(uint256(uint160(value))));
    }

    /**
     * @dev Removes a value from a set. O(1).
     *
     * Returns true if the value was removed from the set, that is if it was
     * present.
     */
    function remove(AddressSet storage set, address value) internal returns (bool) {
        return _remove(set._inner, bytes32(uint256(uint160(value))));
    }

    /**
     * @dev Returns true if the value is in the set. O(1).
     */
    function contains(AddressSet storage set, address value) internal view returns (bool) {
        return _contains(set._inner, bytes32(uint256(uint160(value))));
    }

    /**
     * @dev Returns the number of values in the set. O(1).
     */
    function length(AddressSet storage set) internal view returns (uint256) {
        return _length(set._inner);
    }

    /**
     * @dev Returns the value stored at position `index` in the set. O(1).
     *
     * Note that there are no guarantees on the ordering of values inside the
     * array, and it may change when more values are added or removed.
     *
     * Requirements:
     *
     * - `index` must be strictly less than {length}.
     */
    function at(AddressSet storage set, uint256 index) internal view returns (address) {
        return address(uint160(uint256(_at(set._inner, index))));
    }

    /**
     * @dev Return the entire set in an array
     *
     * WARNING: This operation will copy the entire storage to memory, which can be quite expensive. This is designed
     * to mostly be used by view accessors that are queried without any gas fees. Developers should keep in mind that
     * this function has an unbounded cost, and using it as part of a state-changing function may render the function
     * uncallable if the set grows to a point where copying to memory consumes too much gas to fit in a block.
     */
    function values(AddressSet storage set) internal view returns (address[] memory) {
        bytes32[] memory store = _values(set._inner);
        address[] memory result;

        assembly ("memory-safe") {
            result := store
        }

        return result;
    }

    // UintSet

    struct UintSet {
        Set _inner;
    }

    /**
     * @dev Add a value to a set. O(1).
     *
     * Returns true if the value was added to the set, that is if it was not
     * already present.
     */
    function add(UintSet storage set, uint256 value) internal returns (bool) {
        return _add(set._inner, bytes32(value));
    }

    /**
     * @dev Removes a value from a set. O(1).
     *
     * Returns true if the value was removed from the set, that is if it was
     * present.
     */
    function remove(UintSet storage set, uint256 value) internal returns (bool) {
        return _remove(set._inner, bytes32(value));
    }

    /**
     * @dev Returns true if the value is in the set. O(1).
     */
    function contains(UintSet storage set, uint256 value) internal view returns (bool) {
        return _contains(set._inner, bytes32(value));
    }

    /**
     * @dev Returns the number of values in the set. O(1).
     */
    function length(UintSet storage set) internal view returns (uint256) {
        return _length(set._inner);
    }

    /**
     * @dev Returns the value stored at position `index` in the set. O(1).
     *
     * Note that there are no guarantees on the ordering of values inside the
     * array, and it may change when more values are added or removed.
     *
     * Requirements:
     *
     * - `index` must be strictly less than {length}.
     */
    function at(UintSet storage set, uint256 index) internal view returns (uint256) {
        return uint256(_at(set._inner, index));
    }

    /**
     * @dev Return the entire set in an array
     *
     * WARNING: This operation will copy the entire storage to memory, which can be quite expensive. This is designed
     * to mostly be used by view accessors that are queried without any gas fees. Developers should keep in mind that
     * this function has an unbounded cost, and using it as part of a state-changing function may render the function
     * uncallable if the set grows to a point where copying to memory consumes too much gas to fit in a block.
     */
    function values(UintSet storage set) internal view returns (uint256[] memory) {
        bytes32[] memory store = _values(set._inner);
        uint256[] memory result;

        assembly ("memory-safe") {
            result := store
        }

        return result;
    }
}

contract LockedHubble is ERC20 {
    struct VestPosition {
        uint256 amount;
        uint256 start;
        uint256 maxEnd;
        uint256 vestID;
    }
    using EnumerableSet for EnumerableSet.AddressSet;

    // immutable
    IERC20 public immutable HUBBLE;

    // vars
    address public admiral;
    address public missionControl;
    address public xexStaking;
    uint256 public missionShare = 5000;
    uint256 public maxVest = 180 days;
    EnumerableSet.AddressSet exempt;
    EnumerableSet.AddressSet exemptTo;
    
    // constants
    uint256 public constant BASIS = 10_000;
    uint256 public constant SLASHING_PENALTY = 5000;
    uint256 public constant MIN_VEST = 14 days;
  

    // mappings
    mapping(address => VestPosition[]) public vestInfo;

    // modifiers
    modifier onlyAdmiral() {
        require(msg.sender == admiral, "Not the Admiral");
        _;
    }

     modifier onlyMissionControl() {
        require(msg.sender == missionControl, "Not Mission Control");
        _;
    }

    // errors 
    error ZERO();
    error NO_VEST();
    error CANT_RESCUE();
    error ARRAY_LENGTHS();

    // events
    event Lock(address indexed user, uint256 amount);
    event Crash(address indexed user, uint256 amount);
    event Exemption(address indexed candidate, bool status, bool success);
    event NewVest(
        address indexed user,
        uint256 indexed vestId,
        uint256 indexed amount
    );

     event CancelVesting(
        address indexed user,
        uint256 indexed vestId,
        uint256 amount
    );
 event ExitVesting(
        address indexed user,
        uint256 indexed vestId,
        uint256 amount
    );
    // constructor
    constructor (
        address _hubble
    ) ERC20("Locked Hubble Protocol Shares", "xHUBBLE") {
        HUBBLE = IERC20(_hubble);
        admiral = msg.sender;
    }

    // mint xHUBBLE
    function lock(uint256 _amount) external {
        require(_amount != 0, ZERO());
        HUBBLE.transferFrom(msg.sender, address(this), _amount);
        _mint(msg.sender, _amount);
        emit Lock(msg.sender, _amount);
    }

    // instantly exit xHUBBLE for HUBBLE
    function crash(
        uint256 _amount
    ) external returns (uint256 _exitedAmount) {
        require(_amount != 0, ZERO());
        uint256 penalty = ((_amount * SLASHING_PENALTY) / BASIS);
        uint256 exitAmount = _amount - penalty;
        // burn the xHUBBLE
        _burn(msg.sender, _amount);
        //transfer the user their HUBBLE
        HUBBLE.transfer(msg.sender, exitAmount);
        //transfer mission control their portion
        _mint(missionControl, penalty * missionShare / BASIS);
        // transfer xEX staking their portion
        _mint(xexStaking, penalty - penalty * missionShare / BASIS);
        emit Crash(msg.sender, exitAmount);
        return exitAmount;
    }

    function createVest(uint256 _amount) external {
        require(_amount != 0, ZERO());
        _burn(msg.sender, _amount);
        uint256 vestLength = vestInfo[msg.sender].length;
        vestInfo[msg.sender].push(
            VestPosition(
                _amount,
                block.timestamp,
                block.timestamp + maxVest,
                vestLength
            )
        );
        emit NewVest(msg.sender, vestLength, _amount);
    }

    function exitVest(uint256 _vestID) external {
        VestPosition storage _vest = vestInfo[msg.sender][_vestID];
        require(_vest.amount != 0, NO_VEST());
        uint256 _amount = _vest.amount;
        uint256 _start = _vest.start;
        _vest.amount = 0;
        if (block.timestamp < _start + MIN_VEST) {
            _mint(msg.sender, _amount);
            emit CancelVesting(msg.sender, _vestID, _amount);
        }
        else if (_vest.maxEnd <= block.timestamp) {
            HUBBLE.transfer(msg.sender, _amount);
            emit ExitVesting(msg.sender, _vestID, _amount);
        }
        else {
            uint256 base = (_amount * (SLASHING_PENALTY)) / BASIS;
            uint256 vestEarned = ((_amount *
                (BASIS - SLASHING_PENALTY) *
                (block.timestamp - _start)) / maxVest) / BASIS;
            uint256 exitedAmount = base + vestEarned;
            // transfer the hubble to the loser
            HUBBLE.transfer(msg.sender, exitedAmount);
            // mint xHUBBLE to mission control
            _mint(missionControl,(_amount - exitedAmount)*missionShare/BASIS);
            // mint remaining xHUBBLE to xEX Staking
            _mint(xexStaking,(_amount - exitedAmount) - (_amount - exitedAmount)*missionShare/BASIS);
            emit ExitVesting(msg.sender, _vestID, _amount);
        }
    }

    function rescueTrappedTokens(
        address[] calldata _tokens,
        uint256[] calldata _amounts
    ) external onlyAdmiral {
        for (uint256 i = 0; i < _tokens.length; ++i) {
            /// @dev cant fetch the underlying
            require(_tokens[i] != address(HUBBLE), CANT_RESCUE());
            IERC20(_tokens[i]).transfer(admiral, _amounts[i]);
        }
    }

    // --------------------------------------------------------------------
    // ---- Exemptions (from xSHADOW contract) --------------

    function setExemption(
        address[] calldata _exemptee,
        bool[] calldata _exempt
    ) external onlyAdmiral {
        require(_exemptee.length == _exempt.length, ARRAY_LENGTHS());
        for (uint256 i = 0; i < _exempt.length; ++i) {
            bool success = _exempt[i]
                ? exempt.add(_exemptee[i])
                : exempt.remove(_exemptee[i]);
            emit Exemption(_exemptee[i], _exempt[i], success);
        }
    }

    function setExemptionTo(
        address[] calldata _exemptee,
        bool[] calldata _exempt
    ) external onlyAdmiral {
        require(_exemptee.length == _exempt.length, ARRAY_LENGTHS());
        for (uint256 i = 0; i < _exempt.length; ++i) {
            bool success = _exempt[i]
                ? exemptTo.add(_exemptee[i])
                : exemptTo.remove(_exemptee[i]);
            emit Exemption(_exemptee[i], _exempt[i], success);
        }
    }
    // -- admin --------------------------------------------------------------------
    function reduceMaxVest() external onlyAdmiral {
        require(maxVest - 3 days >= 30 days, "min maxVest is 30 days");
        maxVest -= 3 days;
    }

    function increaseMaxVest() external onlyAdmiral {
        require(maxVest + 3 days <= 180 days, "max maxVest is 180 days");
        maxVest += 3 days;
    }

    function changeAdmiral (
        address newAdmiral
    ) external onlyAdmiral {
        admiral = newAdmiral;
    }

     function changeMissionControl (
        address newMissionControl
    ) external onlyAdmiral {
        exemptTo.add(newMissionControl);
        exempt.add(newMissionControl);
        missionControl = newMissionControl;
    }

    function changeXEXStaking (
        address newStaking
        ) external onlyAdmiral {
        exemptTo.add(newStaking);
        exempt.add(newStaking);
        xexStaking = newStaking;
    }

    function usersTotalVests(
        address _who
    ) public view returns (uint256 _length) {
        return vestInfo[_who].length;
    }

    function getVestInfo(
        address _who,
        uint256 _vestID
    ) public view returns (VestPosition memory) {
        return vestInfo[_who][_vestID];
    }

    function isExempt(address _who) external view returns (bool _exempt) {
        return exempt.contains(_who);
    }

    function _isExempted(
        address _from,
        address _to
    ) internal view returns (bool) {
        return (exempt.contains(_from) ||
            _from == address(0) ||
            _to == address(0) ||
            exemptTo.contains(_to));
    }

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        require(_isExempted(msg.sender,to), "not whitelisted");
        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        require(_isExempted(from,to), "not whitelisted");
        return super.transferFrom(from, to, amount);
    }
}